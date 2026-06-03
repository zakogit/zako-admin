import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { 
  Calendar, 
  Gift, 
  Plus, 
  Trash2, 
  Edit3, 
  Eye, 
  EyeOff,
  Star,
  Diamond,
  Trophy,
  Sparkles,
  Save,
  X
} from 'lucide-react';
import { seasonFlexibleApi } from '../../api/services';
import toast from 'react-hot-toast';

interface SeasonReward {
  id: number;
  day_number: number;
  reward_type: string;
  reward_value: number;
  gift_type: 'simple' | 'premium';
  display_order: number;
  is_active: boolean;
  is_special_reward: boolean;
}

interface RewardCalendar {
  [day: number]: SeasonReward[];
}

const giftTypeIcons = {
  simple: Gift,
  premium: Diamond
};

const giftTypeColors = {
  simple: 'bg-blue-500',
  premium: 'bg-purple-500'
};

const SeasonRewardsPage: React.FC = () => {
  const { seasonId } = useParams<{ seasonId: string }>();
  const queryClient = useQueryClient();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showAddReward, setShowAddReward] = useState(false);
  const [editingReward, setEditingReward] = useState<SeasonReward | null>(null);

  // Fetch season rewards calendar
  const { data: calendar, isLoading } = useQuery({
    queryKey: ['season-rewards-calendar', seasonId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/admin/seasons/${seasonId}/rewards/calendar`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch rewards calendar');
      const result = await response.json();
      return result.data as RewardCalendar;
    },
  });

  // Fetch gift type configurations
  const { data: giftTypes } = useQuery({
    queryKey: ['gift-types'],
    queryFn: async () => {
      const response = await fetch('/api/v1/admin/seasons/gift-types', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch gift types');
      const result = await response.json();
      return result.data;
    },
  });

  // Add flexible rewards mutation
  const addRewardsMutation = useMutation({
    mutationFn: async (rewards: any[]) => {
      const response = await fetch(`/api/v1/admin/seasons/${seasonId}/rewards/flexible`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rewards }),
      });
      if (!response.ok) throw new Error('Failed to add rewards');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['season-rewards-calendar', seasonId] });
      setShowAddReward(false);
    },
  });

  // Toggle reward status mutation
  const toggleRewardMutation = useMutation({
    mutationFn: async ({ rewardId, isActive }: { rewardId: number; isActive: boolean }) => {
      const response = await fetch(`/api/v1/admin/seasons/rewards/${rewardId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: isActive }),
      });
      if (!response.ok) throw new Error('Failed to toggle reward status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['season-rewards-calendar', seasonId] });
    },
  });

  // Delete reward mutation
  const deleteRewardMutation = useMutation({
    mutationFn: async (rewardId: number) => {
      const response = await seasonFlexibleApi.deleteReward(rewardId);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['season-rewards-calendar', seasonId] });
      toast.success('Sovg\'a o\'chirildi');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Sovg\'ani o\'chirishda xatolik');
    }
  });

  // Update reward mutation
  const updateRewardMutation = useMutation({
    mutationFn: async ({ rewardId, rewardData }: { rewardId: number; rewardData: any }) => {
      const response = await seasonFlexibleApi.updateReward(Number(seasonId!), rewardId, rewardData);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['season-rewards-calendar', seasonId] });
      setEditingReward(null);
      toast.success('Sovg\'a yangilandi');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Sovg\'ani yangilashda xatolik');
    }
  });

  // Auto-assign gift type mutation
  const autoAssignMutation = useMutation({
    mutationFn: async (rewardId: number) => {
      const response = await fetch(`/api/v1/admin/seasons/rewards/${rewardId}/auto-assign-type`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to auto-assign gift type');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['season-rewards-calendar', seasonId] });
    },
  });

  const renderRewardCard = (reward: SeasonReward) => {
    const IconComponent = giftTypeIcons[reward.gift_type];
    const colorClass = giftTypeColors[reward.gift_type];

    return (
      <div
        key={reward.id}
        className={`p-4 rounded-lg border-2 ${
          reward.is_active 
            ? 'border-gray-200 dark:border-gray-700' 
            : 'border-red-300 dark:border-red-700 opacity-50'
        } bg-white dark:bg-gray-800 shadow-sm`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className={`p-2 rounded-full ${colorClass} text-white`}>
              <IconComponent className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {reward.reward_value} {reward.reward_type}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {reward.gift_type}
              </p>
            </div>
          </div>
          <div className="flex space-x-1">
            <button
              onClick={() => setEditingReward(reward)}
              className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
              title="Edit reward"
            >
              <Edit3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => autoAssignMutation.mutate(reward.id)}
              className="p-1 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded"
              title="Auto-assign gift type"
            >
              <Sparkles className="h-4 w-4" />
            </button>
            <button
              onClick={() => toggleRewardMutation.mutate({ 
                rewardId: reward.id, 
                isActive: !reward.is_active 
              })}
              className={`p-1 rounded ${
                reward.is_active 
                  ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20' 
                  : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              title={reward.is_active ? 'Deactivate' : 'Activate'}
            >
              {reward.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
            <button
              onClick={() => {
                if (confirm('Sovg\'ani o\'chirishni xohlaysizmi?')) {
                  deleteRewardMutation.mutate(reward.id);
                }
              }}
              className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
              title="Delete reward"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Order: {reward.display_order}</span>
          <span className={`px-2 py-1 rounded text-white text-xs ${giftTypeColors[reward.gift_type]}`}>
            {reward.gift_type}
          </span>
        </div>
      </div>
    );
  };

  const renderCalendarDay = (day: number) => {
    const dayRewards = calendar?.[day] || [];
    const hasRewards = dayRewards.length > 0;
    const hasActiveRewards = dayRewards.some(r => r.is_active);

    return (
      <div
        key={day}
        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
          selectedDay === day
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : hasActiveRewards
            ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20 hover:border-green-300'
            : hasRewards
            ? 'border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 hover:border-yellow-300'
            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-gray-300'
        }`}
        onClick={() => setSelectedDay(selectedDay === day ? null : day)}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-lg text-gray-900 dark:text-gray-100">
            {day}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {dayRewards.length} gifts
          </span>
        </div>
        
        {dayRewards.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {dayRewards.slice(0, 3).map(reward => {
              const IconComponent = giftTypeIcons[reward.gift_type];
              const colorClass = giftTypeColors[reward.gift_type];
              return (
                <div key={reward.id} className={`p-1 rounded ${colorClass} text-white`}>
                  <IconComponent className="h-3 w-3" />
                </div>
              );
            })}
            {dayRewards.length > 3 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">+{dayRewards.length - 3}</span>
            )}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Season Rewards Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage flexible rewards and gift types
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowAddReward(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>Add Rewards</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <div className="lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Rewards Calendar
          </h3>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 30 }, (_, i) => i + 1).map(day => renderCalendarDay(day))}
          </div>
        </div>

        {/* Day Details */}
        <div className="space-y-4">
          {selectedDay && (
            <>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Day {selectedDay} Rewards
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {calendar?.[selectedDay]?.map(renderRewardCard) || (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    No rewards for this day
                  </p>
                )}
              </div>
            </>
          )}

          {/* Gift Type Legend */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h4 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Gift Types</h4>
            <div className="space-y-2">
              {Object.entries(giftTypeIcons).map(([type, IconComponent]) => (
                <div key={type} className="flex items-center space-x-2">
                  <div className={`p-1 rounded ${giftTypeColors[type as keyof typeof giftTypeColors]} text-white`}>
                    <IconComponent className="h-3 w-3" />
                  </div>
                  <span className="text-sm capitalize text-gray-700 dark:text-gray-300">{type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Reward Modal */}
      {showAddReward && (
        <AddRewardModal
          onClose={() => setShowAddReward(false)}
          onSave={(rewards) => addRewardsMutation.mutate(rewards)}
          giftTypes={giftTypes}
        />
      )}

      {/* Edit Reward Modal */}
      {editingReward && (
        <EditRewardModal
          reward={editingReward}
          onClose={() => setEditingReward(null)}
          onSave={(rewardData) => updateRewardMutation.mutate({ 
            rewardId: editingReward.id, 
            rewardData 
          })}
          giftTypes={giftTypes}
        />
      )}
    </div>
  );
};

// Add Reward Modal Component
const AddRewardModal: React.FC<{
  onClose: () => void;
  onSave: (rewards: any[]) => void;
  giftTypes: any[];
}> = ({ onClose, onSave, giftTypes }) => {
  const [rewards, setRewards] = useState([{
    day_number: 1,
    reward_type: 'coins',
    reward_value: 100,
    gift_type: 'simple',
    display_order: 1,
    is_special_reward: false
  }]);

  const addReward = () => {
    setRewards([...rewards, {
      day_number: 1,
      reward_type: 'coins',
      reward_value: 100,
      gift_type: 'simple',
      display_order: rewards.length + 1,
      is_special_reward: false
    }]);
  };

  const removeReward = (index: number) => {
    setRewards(rewards.filter((_, i) => i !== index));
  };

  const updateReward = (index: number, field: string, value: any) => {
    const updated = [...rewards];
    updated[index] = { ...updated[index], [field]: value };
    setRewards(updated);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Add Multiple Rewards
          </h3>
        </div>
        
        <div className="p-6 space-y-6">
          {rewards.map((reward, index) => (
            <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                  Reward #{index + 1}
                </h4>
                {rewards.length > 1 && (
                  <button
                    onClick={() => removeReward(index)}
                    className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Day
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={reward.day_number}
                    onChange={(e) => updateReward(index, 'day_number', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Type
                  </label>
                  <select
                    value={reward.reward_type}
                    onChange={(e) => updateReward(index, 'reward_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                  >
                    <option value="coins">Coins</option>
                    <option value="avatar">Avatar</option>
                    <option value="shield">Shield</option>
                    <option value="badge">Badge</option>
                    <option value="premium_access">Premium Access</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Value
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={reward.reward_value}
                    onChange={(e) => updateReward(index, 'reward_value', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Gift Type
                  </label>
                  <select
                    value={reward.gift_type}
                    onChange={(e) => updateReward(index, 'gift_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                  >
                    <option value="simple">Simple</option>
                    <option value="premium">Premium</option>
                    <option value="legendary">Legendary</option>
                    <option value="exclusive">Exclusive</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
          
          <button
            onClick={addReward}
            className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            + Add Another Reward
          </button>
        </div>
        
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(rewards)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Save className="h-4 w-4" />
            <span>Save Rewards</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Edit Reward Modal Component
const EditRewardModal: React.FC<{
  reward: SeasonReward;
  onClose: () => void;
  onSave: (rewardData: any) => void;
  giftTypes: any[];
}> = ({ reward, onClose, onSave, giftTypes }) => {
  const [formData, setFormData] = useState({
    day_number: reward.day_number,
    reward_type: reward.reward_type,
    reward_value: reward.reward_value,
    gift_type: reward.gift_type,
    display_order: reward.display_order,
    is_special_reward: reward.is_special_reward,
    is_active: reward.is_active
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Edit Reward
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Day
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={formData.day_number}
                onChange={(e) => setFormData({ ...formData, day_number: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Value
              </label>
              <input
                type="number"
                min="1"
                value={formData.reward_value}
                onChange={(e) => setFormData({ ...formData, reward_value: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reward Type
            </label>
            <select
              value={formData.reward_type}
              onChange={(e) => setFormData({ ...formData, reward_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="coins">Coins</option>
              <option value="avatar">Avatar</option>
              <option value="shield">Shield</option>
              <option value="badge">Badge</option>
              <option value="premium_access">Premium Access</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Gift Type
            </label>
            <select
              value={formData.gift_type}
              onChange={(e) => setFormData({ ...formData, gift_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="simple">Simple (oddiy tangalar, kichik mukofotlar)</option>
              <option value="premium">Premium (avatarlar, badgelar, premium kirish)</option>
            </select>
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_special_reward}
                onChange={(e) => setFormData({ ...formData, is_special_reward: e.target.checked })}
                className="mr-2 rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Special Reward</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="mr-2 rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
            </label>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SeasonRewardsPage;