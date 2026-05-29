import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { seasonsApi } from '../../api/services';

interface RewardForm {
  day_number: number;
  reward_type: 'coins' | 'avatar' | 'shield' | 'badge' | 'premium_access';
  reward_value: number;
  is_special_reward: boolean;
}

const CreateSeasonPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    max_participants: '',
    banner_image: ''
  });

  const [rewards, setRewards] = useState<RewardForm[]>([
    { day_number: 1, reward_type: 'coins', reward_value: 50, is_special_reward: false }
  ]);

  const rewardTypes = [
    { value: 'coins', label: 'Tangalar', icon: '🪙' },
    { value: 'avatar', label: 'Avatar', icon: '👤' },
    { value: 'shield', label: 'Himoya qalqoni', icon: '🛡️' },
    { value: 'badge', label: 'Nishon', icon: '🏅' },
    { value: 'premium_access', label: 'Premium kirish', icon: '⭐' }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addReward = () => {
    const nextDay = Math.max(...rewards.map(r => r.day_number)) + 1;
    setRewards(prev => [...prev, {
      day_number: nextDay,
      reward_type: 'coins',
      reward_value: 50,
      is_special_reward: false
    }]);
  };

  const updateReward = (index: number, field: keyof RewardForm, value: any) => {
    setRewards(prev => prev.map((reward, i) => 
      i === index ? { ...reward, [field]: value } : reward
    ));
  };

  const removeReward = (index: number) => {
    if (rewards.length > 1) {
      setRewards(prev => prev.filter((_, i) => i !== index));
    }
  };

  const validateForm = (): string | null => {
    if (!formData.title.trim()) return 'Mavsum nomi kiritilmagan';
    if (!formData.start_date) return 'Boshlanish sanasi kiritilmagan';
    if (!formData.end_date) return 'Tugash sanasi kiritilmagan';
    
    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);
    
    if (startDate >= endDate) return 'Boshlanish sanasi tugash sanasidan oldin bo\'lishi kerak';
    if (startDate < new Date()) return 'Boshlanish sanasi kelajakda bo\'lishi kerak';
    
    // Check reward days are unique
    const days = rewards.map(r => r.day_number);
    const uniqueDays = [...new Set(days)];
    if (days.length !== uniqueDays.length) return 'Bir kun uchun faqat bitta sovg\'a bo\'lishi mumkin';
    
    // Check all reward values are positive
    const invalidReward = rewards.find(r => r.reward_value <= 0);
    if (invalidReward) return 'Barcha sovg\'a qiymatlari musbat bo\'lishi kerak';
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const error = validateForm();
    if (error) {
      alert(error);
      return;
    }

    try {
      setLoading(true);
      
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        start_date: formData.start_date,
        end_date: formData.end_date,
        banner_image: formData.banner_image.trim() || undefined,
        max_participants: formData.max_participants ? parseInt(formData.max_participants) : undefined,
        rewards: rewards.map(reward => ({
          ...reward,
          reward_value: Number(reward.reward_value)
        }))
      };

      await seasonsApi.create(payload);
      navigate('/seasons', { 
        state: { message: 'Mavsum muvaffaqiyatli yaratildi' }
      });
    } catch (err) {
      console.error('Error creating season:', err);
      alert('Mavsum yaratishda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/seasons"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Orqaga"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Yangi Mavsum Yaratish</h1>
          <p className="text-gray-600">Mavsum ma'lumotlari va sovg'alarni sozlang</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Asosiy Ma'lumotlar</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mavsum Nomi *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Masalan: Qish Mavsumi 2024"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tavsif
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Mavsum haqida qisqacha ma'lumot..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Boshlanish Sanasi *
              </label>
              <input
                type="datetime-local"
                name="start_date"
                value={formData.start_date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tugash Sanasi *
              </label>
              <input
                type="datetime-local"
                name="end_date"
                value={formData.end_date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maksimal Qatnashuvchilar
              </label>
              <input
                type="number"
                name="max_participants"
                value={formData.max_participants}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Cheksiz uchun bo'sh qoldiring"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Banner Rasm URL
              </label>
              <input
                type="url"
                name="banner_image"
                value={formData.banner_image}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://example.com/banner.png"
              />
            </div>
          </div>
        </div>

        {/* Daily Rewards */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Kunlik Sovg'alar</h2>
            <button
              type="button"
              onClick={addReward}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Sovg'a Qo'shish
            </button>
          </div>

          <div className="space-y-4">
            {rewards.map((reward, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kun
                    </label>
                    <input
                      type="number"
                      value={reward.day_number}
                      onChange={(e) => updateReward(index, 'day_number', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="1"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sovg'a Turi
                    </label>
                    <select
                      value={reward.reward_type}
                      onChange={(e) => updateReward(index, 'reward_type', e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {rewardTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {reward.reward_type === 'coins' ? 'Tang Soni' : 'Qiymat'}
                    </label>
                    <input
                      type="number"
                      value={reward.reward_value}
                      onChange={(e) => updateReward(index, 'reward_value', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="1"
                      required
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={reward.is_special_reward}
                        onChange={(e) => updateReward(index, 'is_special_reward', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      Maxsus Sovg'a
                    </label>
                  </div>

                  <div>
                    {rewards.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeReward(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="O'chirish"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 justify-end">
          <Link
            to="/seasons"
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Bekor qilish
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            Mavsum Yaratish
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateSeasonPage;