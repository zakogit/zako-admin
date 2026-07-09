import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Gift, 
  Diamond, 
  Trophy, 
  Sparkles,
  Edit3,
  Save,
  X,
  Settings
} from 'lucide-react';

interface GiftTypeConfig {
  id: number;
  type_name: string;
  display_name: string;
  description: string;
  default_color: string;
  default_icon: string;
  default_animation: string;
  min_rarity: string;
  is_active: boolean;
}

const giftTypeIcons = {
  simple: Gift,
  premium: Diamond,
  legendary: Trophy,
  exclusive: Sparkles
};

const animationTypes = [
  { value: 'none', label: 'None' },
  { value: 'glow', label: 'Glow' },
  { value: 'pulse', label: 'Pulse' },
  { value: 'sparkle', label: 'Sparkle' },
  { value: 'rainbow', label: 'Rainbow' }
];

const rarityTypes = [
  { value: 'common', label: 'Common', color: '#6B7280' },
  { value: 'rare', label: 'Rare', color: '#3B82F6' },
  { value: 'epic', label: 'Epic', color: '#8B5CF6' },
  { value: 'legendary', label: 'Legendary', color: '#EF4444' }
];

const GiftTypeManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [editingType, setEditingType] = useState<GiftTypeConfig | null>(null);

  // Fetch gift type configurations
  const { data: giftTypes, isLoading } = useQuery({
    queryKey: ['gift-type-configs'],
    queryFn: async () => {
      const response = await fetch('/api/v1/admin/seasons/gift-types', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch gift type configs');
      const result = await response.json();
      return result.data as GiftTypeConfig[];
    },
  });

  // Update gift type configuration
  const updateGiftTypeMutation = useMutation({
    mutationFn: async (config: GiftTypeConfig) => {
      const response = await fetch(`/api/v1/admin/gift-types/${config.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });
      if (!response.ok) throw new Error('Failed to update gift type');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-type-configs'] });
      setEditingType(null);
    },
  });

  const renderGiftTypeCard = (config: GiftTypeConfig) => {
    const IconComponent = giftTypeIcons[config.type_name as keyof typeof giftTypeIcons] || Gift;
    const isEditing = editingType?.id === config.id;

    if (isEditing) {
      return (
        <div key={config.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-2 border-blue-500">
          <EditGiftTypeForm
            config={editingType}
            onSave={(updatedConfig) => {
              updateGiftTypeMutation.mutate(updatedConfig);
            }}
            onCancel={() => setEditingType(null)}
            onChange={setEditingType}
          />
        </div>
      );
    }

    return (
      <div key={config.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div 
              className="p-3 rounded-full text-white"
              style={{ backgroundColor: config.default_color }}
            >
              <IconComponent className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {config.display_name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {config.type_name}
              </p>
            </div>
          </div>
          <button
            onClick={() => setEditingType(config)}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <Edit3 className="h-4 w-4" />
          </button>
        </div>

        <p className="text-gray-700 dark:text-gray-300 mb-4">
          {config.description}
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Default Color:
            </span>
            <div className="flex items-center space-x-2">
              <div 
                className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600"
                style={{ backgroundColor: config.default_color }}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                {config.default_color}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Default Icon:
            </span>
            <span className="text-lg">{config.default_icon}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Animation:
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
              {config.default_animation}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Min Rarity:
            </span>
            <span 
              className="px-2 py-1 rounded-full text-xs font-medium text-white capitalize"
              style={{ 
                backgroundColor: rarityTypes.find(r => r.value === config.min_rarity)?.color || '#6B7280'
              }}
            >
              {config.min_rarity}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Status:
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              config.is_active 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
            }`}>
              {config.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center space-x-3">
            <Settings className="h-8 w-8 text-blue-600" />
            <span>Gift Type Management</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configure gift types, colors, animations, and rarity settings
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {giftTypes?.map(renderGiftTypeCard)}
      </div>

      {/* Gift Type Usage Statistics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Gift Type Distribution
        </h3>
        <GiftTypeUsageChart giftTypes={giftTypes} />
      </div>
    </div>
  );
};

// Edit Gift Type Form Component
const EditGiftTypeForm: React.FC<{
  config: GiftTypeConfig;
  onSave: (config: GiftTypeConfig) => void;
  onCancel: () => void;
  onChange: (config: GiftTypeConfig) => void;
}> = ({ config, onSave, onCancel, onChange }) => {
  const IconComponent = giftTypeIcons[config.type_name as keyof typeof giftTypeIcons] || Gift;

  const handleChange = (field: string, value: any) => {
    onChange({ ...config, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Edit {config.display_name}
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={() => onSave(config)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Save className="h-4 w-4" />
            <span>Save</span>
          </button>
          <button
            onClick={onCancel}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            <X className="h-4 w-4" />
            <span>Cancel</span>
          </button>
        </div>
      </div>

      {/* Live Preview */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preview:</h4>
        <div className="flex items-center space-x-3">
          <div 
            className="p-3 rounded-full text-white"
            style={{ backgroundColor: config.default_color }}
          >
            <IconComponent className="h-6 w-6" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {config.display_name}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {config.default_icon} • {config.default_animation} • {config.min_rarity}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Display Name
          </label>
          <input
            type="text"
            value={config.display_name}
            onChange={(e) => handleChange('display_name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Default Color
          </label>
          <div className="flex space-x-2">
            <input
              type="color"
              value={config.default_color}
              onChange={(e) => handleChange('default_color', e.target.value)}
              className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer"
            />
            <input
              type="text"
              value={config.default_color}
              onChange={(e) => handleChange('default_color', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Default Icon (Emoji)
          </label>
          <input
            type="text"
            value={config.default_icon}
            onChange={(e) => handleChange('default_icon', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 text-center text-lg"
            maxLength={2}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Default Animation
          </label>
          <select
            value={config.default_animation}
            onChange={(e) => handleChange('default_animation', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
          >
            {animationTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Minimum Rarity
          </label>
          <select
            value={config.min_rarity}
            onChange={(e) => handleChange('min_rarity', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
          >
            {rarityTypes.map(rarity => (
              <option key={rarity.value} value={rarity.value}>
                {rarity.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Status
          </label>
          <select
            value={config.is_active.toString()}
            onChange={(e) => handleChange('is_active', e.target.value === 'true')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description
        </label>
        <textarea
          value={config.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
        />
      </div>
    </div>
  );
};

// Gift Type Usage Chart Component
const GiftTypeUsageChart: React.FC<{ giftTypes: GiftTypeConfig[] | undefined }> = ({ giftTypes }) => {
  // Real usage: season_rewards'dagi gift_type bo'yicha hisob (backend).
  const { data: usageData, isLoading } = useQuery({
    queryKey: ['gift-type-usage'],
    queryFn: async () => {
      const response = await fetch('/api/v1/admin/gift-type-usage', {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
      });
      const json = await response.json();
      return (json.data || []) as Array<{ type: string; count: number; percentage: number }>;
    },
  });

  if (isLoading) {
    return <p className="text-sm text-gray-400 py-4">Yuklanmoqda...</p>;
  }
  if (!usageData || usageData.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-4">Hozircha ma'lumot yo'q</p>;
  }

  return (
    <div className="space-y-4">
      {usageData.map(data => {
        const config = giftTypes?.find(gt => gt.type_name === data.type);
        const IconComponent = giftTypeIcons[data.type as keyof typeof giftTypeIcons] || Gift;
        
        return (
          <div key={data.type} className="flex items-center space-x-4">
            <div 
              className="p-2 rounded text-white flex-shrink-0"
              style={{ backgroundColor: config?.default_color || '#6B7280' }}
            >
              <IconComponent className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                  {data.type}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {data.count} ({data.percentage}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${data.percentage}%`,
                    backgroundColor: config?.default_color || '#6B7280'
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default GiftTypeManagementPage;