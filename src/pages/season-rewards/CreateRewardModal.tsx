import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { X, Coins, Gift, Users } from 'lucide-react';
import api from '../../api/client';
import { Button, Card, Spinner } from '../../components/ui';

interface SeasonReward {
  id?: number;
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
}

interface CardType {
  id: number;
  name: string;
  description: string;
  price_coins: number;
  effect_type: string;
}

interface Avatar {
  id: number;
  name: string;
  url: string;
  gender: 'male' | 'female';
  is_premium: boolean;
}

interface CreateRewardModalProps {
  seasonId: number;
  reward?: SeasonReward | null;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateRewardModal: React.FC<CreateRewardModalProps> = ({
  seasonId,
  reward,
  onClose,
  onSuccess
}) => {
  const isEditing = !!reward?.id;
  
  const [formData, setFormData] = useState<Partial<SeasonReward>>({
    day_number: reward?.day_number || 1,
    reward_type: reward?.reward_type || 'simple',
    reward_category: reward?.reward_category || 'coins',
    coin_amount: reward?.coin_amount || 0,
    card_type_id: reward?.card_type_id || undefined,
    card_quantity: reward?.card_quantity || 1,
    male_avatar_id: reward?.male_avatar_id || undefined,
    female_avatar_id: reward?.female_avatar_id || undefined,
    reward_name: reward?.reward_name || '',
    reward_description: reward?.reward_description || '',
    reward_icon: reward?.reward_icon || ''
  });

  // Fetch card types
  const { data: cardTypes } = useQuery({
    queryKey: ['admin', 'card-types'],
    queryFn: async () => {
      const response = await api.get('/admin/cards/types');
      return response.data.data as CardType[];
    },
    enabled: formData.reward_category === 'cards'
  });

  // Fetch premium avatars
  const { data: avatars, error: avatarsError } = useQuery({
    queryKey: ['admin', 'premium-avatars'],
    queryFn: async () => {
      try {
        const response = await api.get('/admin/avatars?is_premium=true');
        console.log('Avatars API response:', response.data);
        
        if (response.data?.success) {
          // Handle nested data structure: response.data.data.data
          const avatarsData = response.data.data?.data || response.data.data;
          console.log('Avatars data:', avatarsData);
          
          if (Array.isArray(avatarsData)) {
            console.log('Male avatars:', avatarsData.filter(a => a.gender === 'male'));
            console.log('Female avatars:', avatarsData.filter(a => a.gender === 'female'));
            return avatarsData as Avatar[];
          }
        } else {
          console.log('Invalid response structure:', response.data);
          return [];
        }
      } catch (error) {
        console.error('Error fetching avatars:', error);
        return [];
      }
    },
    enabled: formData.reward_category === 'avatars'
  });

  // Create/Update mutation
  const createRewardMutation = useMutation({
    mutationFn: async (data: Partial<SeasonReward>) => {
      const payload: any = {
        season_id: seasonId,
        day_number: data.day_number,
        reward_type: data.reward_type,
        reward_category: data.reward_category,
        reward_name: data.reward_name,
        is_active: true
      };
      
      if (data.reward_description) {
        payload.reward_description = data.reward_description;
      }
      if (data.reward_icon) {
        payload.reward_icon = data.reward_icon;
      }
      
      if (data.reward_category === 'coins') {
        payload.coin_amount = data.coin_amount || 0;
      } else if (data.reward_category === 'cards') {
        payload.card_type_id = data.card_type_id;
        payload.card_quantity = data.card_quantity || 1;
      } else if (data.reward_category === 'avatars') {
        if (data.male_avatar_id) {
          payload.male_avatar_id = data.male_avatar_id;
        }
        if (data.female_avatar_id) {
          payload.female_avatar_id = data.female_avatar_id;
        }
      }
      
      const response = await api.post(`/season-rewards/admin/season/${seasonId}/rewards`, payload);
      return response.data;
    },
    onSuccess: () => {
      onSuccess();
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!formData.reward_name?.trim()) {
      alert('Sovga nomini kiriting');
      return;
    }
    
    if (formData.reward_category === 'coins' && !formData.coin_amount) {
      alert('Tanga miqdorini kiriting');
      return;
    }
    
    if (formData.reward_category === 'cards' && !formData.card_type_id) {
      alert('Card turini tanlang');
      return;
    }
    
    if (formData.reward_category === 'avatars' && !formData.male_avatar_id && !formData.female_avatar_id) {
      alert('Kamida bitta avatar tanlang');
      return;
    }

    createRewardMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof SeasonReward, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Clear inappropriate fields based on category
  useEffect(() => {
    setFormData(prev => {
      const updates: Partial<SeasonReward> = { ...prev };
      
      if (prev.reward_category === 'coins') {
        updates.card_type_id = undefined;
        updates.card_quantity = undefined;
        updates.male_avatar_id = undefined;
        updates.female_avatar_id = undefined;
      } else if (prev.reward_category === 'cards') {
        updates.coin_amount = undefined;
        updates.male_avatar_id = undefined;
        updates.female_avatar_id = undefined;
      } else if (prev.reward_category === 'avatars') {
        updates.coin_amount = undefined;
        updates.card_type_id = undefined;
        updates.card_quantity = undefined;
      }
      
      return updates;
    });
  }, [formData.reward_category]);

  // Auto-generate reward name based on category and amount
  useEffect(() => {
    if (formData.reward_category === 'coins' && formData.coin_amount) {
      const type = formData.reward_type === 'premium' ? 'Premium ' : '';
      setFormData(prev => ({
        ...prev,
        reward_name: `${formData.coin_amount || 0} ${type}Tanga`
      }));
    } else if (formData.reward_category === 'cards' && formData.card_type_id && cardTypes) {
      const selectedCard = cardTypes.find(card => card.id === formData.card_type_id);
      if (selectedCard) {
        const quantity = formData.card_quantity || 1;
        setFormData(prev => ({
          ...prev,
          reward_name: `${quantity}x ${selectedCard.name}`
        }));
      }
    } else if (formData.reward_category === 'avatars' && (formData.male_avatar_id || formData.female_avatar_id)) {
      setFormData(prev => ({
        ...prev,
        reward_name: 'Premium Avatar'
      }));
    }
  }, [formData.reward_category, formData.coin_amount, formData.reward_type, formData.card_type_id, formData.card_quantity, formData.male_avatar_id, formData.female_avatar_id, cardTypes]);

  // Safely filter avatars
  const safeAvatars = Array.isArray(avatars) ? avatars : [];
  const maleAvatars = safeAvatars.filter(a => a && a.gender === 'male');
  const femaleAvatars = safeAvatars.filter(a => a && a.gender === 'female');
  
  console.log('SafeAvatars:', safeAvatars);
  console.log('MaleAvatars filtered:', maleAvatars);
  console.log('FemaleAvatars filtered:', femaleAvatars);

  const renderAvatarGrid = (avatarList: Avatar[], gender: 'male' | 'female') => {
    const fieldName = gender === 'male' ? 'male_avatar_id' : 'female_avatar_id';
    const selectedId = gender === 'male' ? formData.male_avatar_id : formData.female_avatar_id;
    const borderColor = gender === 'male' ? 'border-blue-500 bg-blue-50' : 'border-pink-500 bg-pink-50';

    if (avatarsError) {
      return (
        <div className="col-span-4 text-center py-4 text-red-500 text-sm">
          Avatarlarni yuklashda xatolik
        </div>
      );
    }

    if (avatarList.length === 0) {
      return (
        <div className="col-span-4 text-center py-4 text-gray-500 text-sm">
          {gender === 'male' ? 'Erkak' : 'Ayol'} avatarlar topilmadi
        </div>
      );
    }

    return avatarList.map(avatar => (
      <button
        key={avatar.id}
        type="button"
        onClick={() => handleInputChange(fieldName, selectedId === avatar.id ? undefined : avatar.id)}
        className={`p-2 rounded-lg border-2 transition-colors ${
          selectedId === avatar.id
            ? borderColor
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <img
          src={`http://localhost:3000${avatar.url || ''}`}
          alt={avatar.name}
          className="w-12 h-12 rounded-full mx-auto mb-1"
        />
        <p className="text-xs">{avatar.name}</p>
      </button>
    ));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              {isEditing ? 'Sovgani Tahrirlash' : 'Yangi Sovga Qoshish'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kun raqami
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.day_number}
                  onChange={(e) => handleInputChange('day_number', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sovga turi
                </label>
                <select
                  value={formData.reward_type}
                  onChange={(e) => handleInputChange('reward_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="simple">Simple</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sovga kategoriyasi
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'coins', label: 'Tangalar', icon: Coins, premium: false },
                  { value: 'cards', label: 'Cardlar', icon: Gift, premium: true },
                  { value: 'avatars', label: 'Avatarlar', icon: Users, premium: true }
                ].map(category => (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() => handleInputChange('reward_category', category.value)}
                    disabled={category.premium && formData.reward_type === 'simple'}
                    className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                      formData.reward_category === category.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${
                      category.premium && formData.reward_type === 'simple'
                        ? 'opacity-50 cursor-not-allowed'
                        : 'cursor-pointer'
                    }`}
                  >
                    <category.icon className="w-6 h-6" />
                    <span className="text-sm font-medium">{category.label}</span>
                    {category.premium && (
                      <span className="text-xs text-yellow-600">Premium only</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {formData.reward_category === 'coins' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanga miqdori
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.coin_amount || ''}
                  onChange={(e) => handleInputChange('coin_amount', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="50"
                  required
                />
              </div>
            )}

            {formData.reward_category === 'cards' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Card turi
                  </label>
                  <select
                    value={formData.card_type_id || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleInputChange('card_type_id', value ? parseInt(value, 10) : undefined);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Card tanlang...</option>
                    {cardTypes?.map(card => (
                      <option key={card.id} value={card.id}>
                        {card.name} ({card.price_coins} tanga)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Miqdor
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.card_quantity || ''}
                    onChange={(e) => handleInputChange('card_quantity', parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {formData.reward_category === 'avatars' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Erkak avatar
                  </label>
                  <div className="grid grid-cols-4 gap-3 max-h-48 overflow-y-auto border rounded-lg p-3">
                    {renderAvatarGrid(maleAvatars, 'male')}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ayol avatar
                  </label>
                  <div className="grid grid-cols-4 gap-3 max-h-48 overflow-y-auto border rounded-lg p-3">
                    {renderAvatarGrid(femaleAvatars, 'female')}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sovga nomi
                </label>
                <input
                  type="text"
                  value={formData.reward_name}
                  onChange={(e) => handleInputChange('reward_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="50 Tanga"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tavsif (ixtiyoriy)
                </label>
                <textarea
                  value={formData.reward_description}
                  onChange={(e) => handleInputChange('reward_description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Season boshlanishi uchun sovga..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
              >
                Bekor qilish
              </Button>
              <Button
                type="submit"
                disabled={createRewardMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {createRewardMutation.isPending && <Spinner size="sm" />}
                {isEditing ? 'Yangilash' : 'Qoshish'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default CreateRewardModal;