import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, Coins, Gift, Users, Edit2, Trash2, Trophy } from 'lucide-react';
import api from '../../api/client';
import { Button, Card, Spinner } from '../../components/ui';
import CreateRewardModal from './CreateRewardModal';

interface Season {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
}

interface SeasonReward {
  id: number;
  day_number: number;
  reward_type: 'simple' | 'premium';
  reward_category: 'coins' | 'cards' | 'avatars';
  coin_amount?: number;
  card_type_id?: number;
  card_quantity?: number;
  male_avatar_id?: number;
  female_avatar_id?: number;
  reward_name: string;
  reward_description?: string;
  reward_icon?: string;
  is_active: boolean;
}

interface RewardStatistics {
  reward_category: string;
  reward_type: string;
  total_rewards: number;
  total_claims: number;
  total_coins_distributed: number;
}

const SeasonRewardsPage: React.FC = () => {
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingReward, setEditingReward] = useState<SeasonReward | null>(null);
  const queryClient = useQueryClient();


  // Fetch seasons
  const { data: seasons } = useQuery({
    queryKey: ['admin', 'seasons'],
    queryFn: async () => {
      const response = await api.get('/admin/seasons');
      return response.data.data as Season[];
    }
  });

  // Fetch season rewards
  const { data: rewards, isLoading: rewardsLoading } = useQuery({
    queryKey: ['admin', 'season-rewards', selectedSeason],
    queryFn: async () => {
      if (!selectedSeason) return [];
      const response = await api.get(`/season-rewards/admin/season/${selectedSeason}/rewards`);
      return response.data.data as SeasonReward[];
    },
    enabled: !!selectedSeason
  });

  // Fetch season statistics
  const { data: statistics } = useQuery({
    queryKey: ['admin', 'season-statistics', selectedSeason],
    queryFn: async () => {
      if (!selectedSeason) return [];
      const response = await api.get(`/season-rewards/admin/season/${selectedSeason}/statistics`);
      return response.data.data as RewardStatistics[];
    },
    enabled: !!selectedSeason
  });

  // Delete reward mutation
  const deleteRewardMutation = useMutation({
    mutationFn: async ({ dayNumber, rewardType }: { dayNumber: number; rewardType: 'simple' | 'premium' }) => {
      await api.delete(`/season-rewards/admin/season/${selectedSeason}/rewards/${dayNumber}/${rewardType}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'season-rewards', selectedSeason] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'season-statistics', selectedSeason] });
    }
  });

  const handleDeleteReward = (dayNumber: number, rewardType: 'simple' | 'premium') => {
    if (confirm(`${dayNumber}-kun ${rewardType} sovg\'asini o'chirishni tasdiqlaysizmi?`)) {
      deleteRewardMutation.mutate({ dayNumber, rewardType });
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'coins': return <Coins className="w-4 h-4" />;
      case 'cards': return <Gift className="w-4 h-4" />;
      case 'avatars': return <Users className="w-4 h-4" />;
      default: return <Trophy className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'coins': return 'bg-yellow-100 text-yellow-800';
      case 'cards': return 'bg-purple-100 text-purple-800';
      case 'avatars': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };


  // Group rewards by day
  const rewardsByDay = React.useMemo(() => {
    if (!rewards) return {};
    
    const grouped: { [key: number]: { simple?: SeasonReward; premium?: SeasonReward } } = {};
    
    rewards.forEach(reward => {
      if (!grouped[reward.day_number]) {
        grouped[reward.day_number] = {};
      }
      grouped[reward.day_number][reward.reward_type] = reward;
    });
    
    return grouped;
  }, [rewards]);

  const maxDay = Object.keys(rewardsByDay).length > 0 
    ? Math.max(...Object.keys(rewardsByDay).map(Number)) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Season Sovg'alari</h1>
          <p className="text-gray-600">Kunlik sovg'alarni boshqarish va statistika</p>
        </div>
        
        {selectedSeason && (
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Sovg'a Qo'shish
          </Button>
        )}
      </div>

      {/* Season Selector */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <Calendar className="w-5 h-5 text-gray-500" />
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Season tanlang
            </label>
            <select
              value={selectedSeason || ''}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedSeason(value ? parseInt(value, 10) : null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Season tanlang...</option>
              {seasons?.map(season => (
                <option key={season.id} value={season.id}>
                  {season.name} ({new Date(season.start_date).toLocaleDateString()} - {new Date(season.end_date).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Statistics */}
      {selectedSeason && statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statistics.map((stat, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-center gap-3">
                {getCategoryIcon(stat.reward_category)}
                <div className="flex-1">
                  <p className="text-sm text-gray-600">
                    {stat.reward_category} ({stat.reward_type})
                  </p>
                  <p className="text-lg font-semibold">{stat.total_rewards} sovg'a</p>
                  <p className="text-xs text-gray-500">{stat.total_claims} marta olingan</p>
                  {stat.total_coins_distributed > 0 && (
                    <p className="text-xs text-green-600">
                      {stat.total_coins_distributed} tanga tarqatilgan
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Rewards Calendar */}
      {selectedSeason && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Sovg'alar Kalendari</h2>
          
          {rewardsLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : Object.keys(rewardsByDay).length === 0 ? (
            <div className="text-center py-8">
              <Gift className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Bu season uchun sovg'alar mavjud emas</p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Birinchi Sovg'ani Qo'shish
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: Math.min(maxDay + 3, 31) }, (_, i) => i + 1).map(day => {
                const dayRewards = rewardsByDay[day];
                
                return (
                  <Card key={day} className="p-4 border-2 border-dashed border-gray-200 hover:border-blue-300 transition-colors">
                    <div className="text-center mb-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-semibold flex items-center justify-center mx-auto mb-2">
                        {day}
                      </div>
                      <p className="text-xs text-gray-500">{day}-kun</p>
                    </div>

                    <div className="space-y-2">
                      {/* Simple Reward */}
                      {dayRewards?.simple ? (
                        <div className="p-2 rounded bg-gray-50 border">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(dayRewards.simple.reward_category)}`}>
                              {getCategoryIcon(dayRewards.simple.reward_category)}
                              <span className="ml-1">Simple</span>
                            </span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  setEditingReward(dayRewards.simple!);
                                  setShowCreateModal(true);
                                }}
                                className="p-1 text-gray-400 hover:text-blue-600"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteReward(day, 'simple')}
                                className="p-1 text-gray-400 hover:text-red-600"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs font-medium">{dayRewards.simple.reward_name}</p>
                          {dayRewards.simple.coin_amount && (
                            <p className="text-xs text-yellow-600">{dayRewards.simple.coin_amount} tanga</p>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingReward({ 
                              id: 0,
                              day_number: day, 
                              reward_type: 'simple',
                              reward_category: 'coins',
                              reward_name: '',
                              is_active: true
                            });
                            setShowCreateModal(true);
                          }}
                          className="w-full p-2 border-2 border-dashed border-gray-200 rounded text-xs text-gray-400 hover:border-blue-300 hover:text-blue-600"
                        >
                          + Simple
                        </button>
                      )}

                      {/* Premium Reward */}
                      {dayRewards?.premium ? (
                        <div className="p-2 rounded bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200">
                          <div className="flex items-center justify-between mb-1">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                              {getCategoryIcon(dayRewards.premium.reward_category)}
                              <span className="ml-1">Premium</span>
                            </span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  setEditingReward(dayRewards.premium!);
                                  setShowCreateModal(true);
                                }}
                                className="p-1 text-gray-400 hover:text-blue-600"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteReward(day, 'premium')}
                                className="p-1 text-gray-400 hover:text-red-600"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs font-medium">{dayRewards.premium.reward_name}</p>
                          {dayRewards.premium.coin_amount && (
                            <p className="text-xs text-yellow-600">{dayRewards.premium.coin_amount} tanga</p>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingReward({ 
                              id: 0,
                              day_number: day, 
                              reward_type: 'premium',
                              reward_category: 'coins',
                              reward_name: '',
                              is_active: true
                            });
                            setShowCreateModal(true);
                          }}
                          className="w-full p-2 border-2 border-dashed border-yellow-200 rounded text-xs text-yellow-600 hover:border-yellow-400 hover:bg-yellow-50"
                        >
                          + Premium
                        </button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <CreateRewardModal
          seasonId={selectedSeason!}
          reward={editingReward}
          onClose={() => {
            setShowCreateModal(false);
            setEditingReward(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'season-rewards', selectedSeason] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'season-statistics', selectedSeason] });
            setShowCreateModal(false);
            setEditingReward(null);
          }}
        />
      )}
    </div>
  );
};

export default SeasonRewardsPage;