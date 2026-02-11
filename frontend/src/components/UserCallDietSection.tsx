import React, { useState } from 'react';
import {
  Building2,
  User,
  Tag,
  Plus,
  X,
  Loader2,
} from 'lucide-react';
import { useUserCallDiet, useNewsTags } from '../services/newsManager';

interface UserCallDietSectionProps {
  userId: string;
}

export const UserCallDietSection: React.FC<UserCallDietSectionProps> = ({ userId }) => {
  const {
    callDiet,
    loading,
    addCompany,
    removeCompany,
    addPerson,
    removePerson,
    addTag,
    removeTag,
  } = useUserCallDiet(userId);

  const { tags: allTags } = useNewsTags();

  const [activeTab, setActiveTab] = useState<'companies' | 'people' | 'tags'>('companies');
  const [newCompany, setNewCompany] = useState('');
  const [newTicker, setNewTicker] = useState('');
  const [newPerson, setNewPerson] = useState('');
  const [newPersonAffiliation, setNewPersonAffiliation] = useState('');
  const [addingCompany, setAddingCompany] = useState(false);
  const [addingPerson, setAddingPerson] = useState(false);
  const [addingTag, setAddingTag] = useState(false);

  const handleAddCompany = async () => {
    if (!newCompany.trim()) return;
    setAddingCompany(true);
    try {
      await addCompany(newCompany.trim(), newTicker.trim() || undefined);
      setNewCompany('');
      setNewTicker('');
    } catch (err) {
      console.error('Failed to add company:', err);
    } finally {
      setAddingCompany(false);
    }
  };

  const handleAddPerson = async () => {
    if (!newPerson.trim()) return;
    setAddingPerson(true);
    try {
      await addPerson(newPerson.trim(), newPersonAffiliation.trim() || undefined);
      setNewPerson('');
      setNewPersonAffiliation('');
    } catch (err) {
      console.error('Failed to add person:', err);
    } finally {
      setAddingPerson(false);
    }
  };

  const handleAddTag = async (tagId: string) => {
    setAddingTag(true);
    try {
      await addTag(tagId);
    } catch (err) {
      console.error('Failed to add tag:', err);
    } finally {
      setAddingTag(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin text-slate-400" size={24} />
      </div>
    );
  }

  const tabs = [
    { key: 'companies' as const, label: 'Companies', icon: Building2, count: callDiet?.companies.length || 0 },
    { key: 'people' as const, label: 'People', icon: User, count: callDiet?.people.length || 0 },
    { key: 'tags' as const, label: 'Tags', icon: Tag, count: callDiet?.tags.length || 0 },
  ];

  const assignedTagIds = new Set(callDiet?.tags.map(t => t.id) || []);
  const availableTags = allTags.filter(t => !assignedTagIds.has(t.id));

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
        <h4 className="font-semibold text-slate-700 text-sm">News Call Diet</h4>
        <p className="text-xs text-slate-500 mt-0.5">Companies, people, and topics this user tracks for news</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-brand-600 border-b-2 border-brand-500 bg-brand-50/50'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
              activeTab === tab.key ? 'bg-brand-100 text-brand-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* Companies Tab */}
        {activeTab === 'companies' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={newCompany}
                onChange={e => setNewCompany(e.target.value)}
                placeholder="Company name"
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/50"
                onKeyDown={e => e.key === 'Enter' && handleAddCompany()}
              />
              <input
                type="text"
                value={newTicker}
                onChange={e => setNewTicker(e.target.value)}
                placeholder="Ticker"
                className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/50"
                onKeyDown={e => e.key === 'Enter' && handleAddCompany()}
              />
              <button
                onClick={handleAddCompany}
                disabled={!newCompany.trim() || addingCompany}
                className="flex items-center gap-1 px-3 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors"
              >
                {addingCompany ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Add
              </button>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {callDiet?.companies.map(company => (
                <div key={company.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg group">
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-blue-500" />
                    <span className="text-sm font-medium text-slate-700">{company.name}</span>
                    {company.ticker && (
                      <span className="text-xs text-slate-400">({company.ticker})</span>
                    )}
                  </div>
                  <button
                    onClick={() => removeCompany(company.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {(!callDiet?.companies || callDiet.companies.length === 0) && (
                <p className="text-sm text-slate-400 text-center py-4">No companies tracked</p>
              )}
            </div>
          </div>
        )}

        {/* People Tab */}
        {activeTab === 'people' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={newPerson}
                onChange={e => setNewPerson(e.target.value)}
                placeholder="Person name"
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/50"
                onKeyDown={e => e.key === 'Enter' && handleAddPerson()}
              />
              <input
                type="text"
                value={newPersonAffiliation}
                onChange={e => setNewPersonAffiliation(e.target.value)}
                placeholder="Company"
                className="w-32 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/50"
                onKeyDown={e => e.key === 'Enter' && handleAddPerson()}
              />
              <button
                onClick={handleAddPerson}
                disabled={!newPerson.trim() || addingPerson}
                className="flex items-center gap-1 px-3 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors"
              >
                {addingPerson ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Add
              </button>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {callDiet?.people.map(person => (
                <div key={person.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg group">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-purple-500" />
                    <span className="text-sm font-medium text-slate-700">{person.name}</span>
                    {person.companyAffiliation && (
                      <span className="text-xs text-slate-400">({person.companyAffiliation})</span>
                    )}
                  </div>
                  <button
                    onClick={() => removePerson(person.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {(!callDiet?.people || callDiet.people.length === 0) && (
                <p className="text-sm text-slate-400 text-center py-4">No people tracked</p>
              )}
            </div>
          </div>
        )}

        {/* Tags Tab */}
        {activeTab === 'tags' && (
          <div className="space-y-3">
            {availableTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => handleAddTag(tag.id)}
                    disabled={addingTag}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full text-xs font-medium hover:bg-brand-50 hover:text-brand-600 transition-colors"
                  >
                    <Plus size={12} />
                    {tag.name}
                  </button>
                ))}
              </div>
            )}
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {callDiet?.tags.map(tag => (
                <div key={tag.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg group">
                  <div className="flex items-center gap-2">
                    <Tag size={14} className="text-emerald-500" />
                    <span className="text-sm font-medium text-slate-700">{tag.name}</span>
                    <span className="text-xs text-slate-400 capitalize">{tag.category}</span>
                  </div>
                  <button
                    onClick={() => removeTag(tag.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {(!callDiet?.tags || callDiet.tags.length === 0) && (
                <p className="text-sm text-slate-400 text-center py-4">No tags assigned</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
