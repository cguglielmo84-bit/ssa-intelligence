/**
 * News Setup Page
 * Manage Revenue Owners, their Call Diets, and Tags
 */

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X, Building2, User, Tag, ChevronRight, Loader2, Save } from 'lucide-react';
import {
  useRevenueOwners,
  useNewsTags,
  RevenueOwner,
  NewsTag,
  TrackedCompany,
  TrackedPerson,
} from '../services/newsManager';

interface NewsSetupProps {
  onNavigate: (path: string) => void;
}

export const NewsSetup: React.FC<NewsSetupProps> = ({ onNavigate }) => {
  const {
    owners,
    loading: ownersLoading,
    fetchOwners,
    getOwnerDetails,
    createOwner,
    deleteOwner,
    addCompanyToOwner,
    removeCompanyFromOwner,
    addPersonToOwner,
    removePersonFromOwner,
    addTagToOwner,
    removeTagFromOwner,
  } = useRevenueOwners();

  const { tags, loading: tagsLoading } = useNewsTags();

  const [selectedOwner, setSelectedOwner] = useState<RevenueOwner | null>(null);
  const [ownerDetails, setOwnerDetails] = useState<RevenueOwner | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Form states
  const [newOwnerName, setNewOwnerName] = useState('');
  const [companyInputs, setCompanyInputs] = useState<{ name: string; ticker: string; cik: string }[]>([]);
  const [personInputs, setPersonInputs] = useState<{ name: string; title: string }[]>([]);
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [showAddTag, setShowAddTag] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load owner details when selected
  useEffect(() => {
    if (selectedOwner) {
      setLoadingDetails(true);
      getOwnerDetails(selectedOwner.id)
        .then(setOwnerDetails)
        .finally(() => setLoadingDetails(false));
    } else {
      setOwnerDetails(null);
    }
  }, [selectedOwner, getOwnerDetails]);

  const handleCreateOwner = async () => {
    if (!newOwnerName.trim()) return;
    try {
      const owner = await createOwner(newOwnerName.trim());
      setNewOwnerName('');
      setSelectedOwner(owner);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create');
    }
  };

  const handleDeleteOwner = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Revenue Owner?')) return;
    try {
      await deleteOwner(id);
      if (selectedOwner?.id === id) {
        setSelectedOwner(null);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  // Company input handlers
  const addCompanyInputRow = () => {
    setCompanyInputs(prev => [...prev, { name: '', ticker: '', cik: '' }]);
  };

  const updateCompanyInput = (index: number, field: 'name' | 'ticker' | 'cik', value: string) => {
    setCompanyInputs(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const removeCompanyInputRow = (index: number) => {
    setCompanyInputs(prev => prev.filter((_, i) => i !== index));
  };

  // Person input handlers
  const addPersonInputRow = () => {
    setPersonInputs(prev => [...prev, { name: '', title: '' }]);
  };

  const updatePersonInput = (index: number, field: 'name' | 'title', value: string) => {
    setPersonInputs(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const removePersonInputRow = (index: number) => {
    setPersonInputs(prev => prev.filter((_, i) => i !== index));
  };

  // Get valid inputs (with non-empty names)
  const validCompanyInputs = companyInputs.filter(c => c.name.trim());
  const validPersonInputs = personInputs.filter(p => p.name.trim());

  const handleSaveChanges = async () => {
    if (!selectedOwner) return;
    setSaving(true);
    try {
      // Add companies
      for (const company of validCompanyInputs) {
        await addCompanyToOwner(
          selectedOwner.id,
          company.name.trim(),
          company.ticker.trim() || undefined,
          company.cik.trim() || undefined
        );
      }

      // Add people
      for (const person of validPersonInputs) {
        await addPersonToOwner(selectedOwner.id, person.name.trim(), person.title.trim() || undefined);
      }

      // Clear inputs and refresh
      setCompanyInputs([]);
      setPersonInputs([]);
      setShowAddCompany(false);
      setShowAddPerson(false);

      const updated = await getOwnerDetails(selectedOwner.id);
      setOwnerDetails(updated);

      // Refresh the owners list to update counts
      fetchOwners();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCompany = async (companyId: string) => {
    if (!selectedOwner) return;
    try {
      await removeCompanyFromOwner(selectedOwner.id, companyId);
      const updated = await getOwnerDetails(selectedOwner.id);
      setOwnerDetails(updated);
      fetchOwners();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove company');
    }
  };

  const handleRemovePerson = async (personId: string) => {
    if (!selectedOwner) return;
    try {
      await removePersonFromOwner(selectedOwner.id, personId);
      const updated = await getOwnerDetails(selectedOwner.id);
      setOwnerDetails(updated);
      fetchOwners();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove person');
    }
  };

  const handleToggleTag = async (tagId: string) => {
    if (!selectedOwner || !ownerDetails) return;
    const hasTag = ownerDetails.tags?.some(t => t.id === tagId);
    try {
      if (hasTag) {
        await removeTagFromOwner(selectedOwner.id, tagId);
      } else {
        await addTagToOwner(selectedOwner.id, tagId);
      }
      const updated = await getOwnerDetails(selectedOwner.id);
      setOwnerDetails(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update tag');
    }
  };

  if (ownersLoading || tagsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">News Setup</h2>
          <p className="text-slate-500 mt-1">
            Configure Revenue Owners and their tracked companies, people, and topics
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Owners List */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Revenue Owners</h3>
          </div>

          <div className="p-4 border-b border-slate-100">
            <div className="flex gap-2">
              <input
                type="text"
                value={newOwnerName}
                onChange={(e) => setNewOwnerName(e.target.value)}
                placeholder="New owner name..."
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateOwner()}
              />
              <button
                onClick={handleCreateOwner}
                disabled={!newOwnerName.trim()}
                className="px-3 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {owners.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No revenue owners yet. Create one to get started.
              </div>
            ) : (
              owners.map((owner) => (
                <div
                  key={owner.id}
                  className={`flex items-center justify-between p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${
                    selectedOwner?.id === owner.id ? 'bg-brand-50' : ''
                  }`}
                  onClick={() => setSelectedOwner(owner)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-sm font-medium">
                      {owner.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-slate-800">{owner.name}</div>
                      <div className="text-xs text-slate-400">
                        {owner._count?.companies || 0} companies, {owner._count?.people || 0} people
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteOwner(owner.id);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                    <ChevronRight size={16} className="text-slate-300" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Call Diet Editor */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
          {!selectedOwner ? (
            <div className="p-8 text-center text-slate-400 h-full flex items-center justify-center">
              Select a Revenue Owner to edit their Call Diet
            </div>
          ) : loadingDetails ? (
            <div className="p-8 text-center h-full flex items-center justify-center">
              <Loader2 className="animate-spin text-slate-400" size={32} />
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800">
                  Call Diet for {selectedOwner.name}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Configure companies, people, and topics to track for news
                </p>
              </div>

              <div className="p-4 space-y-6">
                {/* Companies Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Building2 size={18} className="text-slate-500" />
                      <span className="font-medium text-slate-700">Companies</span>
                      <span className="text-xs text-slate-400">
                        ({ownerDetails?.companies?.length || 0})
                      </span>
                    </div>
                    {!showAddCompany && (
                      <button
                        onClick={() => {
                          setShowAddCompany(true);
                          setCompanyInputs([{ name: '', ticker: '', cik: '' }]);
                        }}
                        className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                      >
                        + Add Companies
                      </button>
                    )}
                  </div>

                  {showAddCompany && (
                    <div className="mb-3 p-3 bg-slate-50 rounded-lg space-y-2">
                      {companyInputs.map((input, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={input.name}
                            onChange={(e) => updateCompanyInput(index, 'name', e.target.value)}
                            placeholder="Company name"
                            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500/20"
                          />
                          <input
                            type="text"
                            value={input.ticker}
                            onChange={(e) => updateCompanyInput(index, 'ticker', e.target.value)}
                            placeholder="Ticker"
                            className="w-24 px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500/20"
                          />
                          <input
                            type="text"
                            value={input.cik}
                            onChange={(e) => updateCompanyInput(index, 'cik', e.target.value)}
                            placeholder="CIK"
                            className="w-24 px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500/20"
                            title="SEC Central Index Key (10 digits)"
                          />
                          <button
                            onClick={() => removeCompanyInputRow(index)}
                            className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-2">
                        <button
                          onClick={addCompanyInputRow}
                          className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium"
                        >
                          <Plus size={16} />
                          Add another
                        </button>
                        <button
                          onClick={() => {
                            setShowAddCompany(false);
                            setCompanyInputs([]);
                          }}
                          className="text-sm text-slate-500 hover:text-slate-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {ownerDetails?.companies?.length === 0 && (
                      <span className="text-sm text-slate-400">No companies added</span>
                    )}
                    {ownerDetails?.companies?.map((company) => (
                      <span
                        key={company.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm"
                      >
                        {company.name}
                        {(company.ticker || company.cik) && (
                          <span className="text-blue-400">
                            ({[company.ticker, company.cik && `CIK: ${company.cik}`].filter(Boolean).join(' | ')})
                          </span>
                        )}
                        <button
                          onClick={() => handleRemoveCompany(company.id)}
                          className="ml-1 text-blue-400 hover:text-blue-600"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* People Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <User size={18} className="text-slate-500" />
                      <span className="font-medium text-slate-700">People</span>
                      <span className="text-xs text-slate-400">
                        ({ownerDetails?.people?.length || 0})
                      </span>
                    </div>
                    {!showAddPerson && (
                      <button
                        onClick={() => {
                          setShowAddPerson(true);
                          setPersonInputs([{ name: '', title: '' }]);
                        }}
                        className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                      >
                        + Add People
                      </button>
                    )}
                  </div>

                  {showAddPerson && (
                    <div className="mb-3 p-3 bg-slate-50 rounded-lg space-y-2">
                      {personInputs.map((input, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={input.name}
                            onChange={(e) => updatePersonInput(index, 'name', e.target.value)}
                            placeholder="Person name"
                            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500/20"
                          />
                          <input
                            type="text"
                            value={input.title}
                            onChange={(e) => updatePersonInput(index, 'title', e.target.value)}
                            placeholder="Title"
                            className="w-32 px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500/20"
                          />
                          <button
                            onClick={() => removePersonInputRow(index)}
                            className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-2">
                        <button
                          onClick={addPersonInputRow}
                          className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium"
                        >
                          <Plus size={16} />
                          Add another
                        </button>
                        <button
                          onClick={() => {
                            setShowAddPerson(false);
                            setPersonInputs([]);
                          }}
                          className="text-sm text-slate-500 hover:text-slate-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {ownerDetails?.people?.length === 0 && (
                      <span className="text-sm text-slate-400">No people added</span>
                    )}
                    {ownerDetails?.people?.map((person) => (
                      <span
                        key={person.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-sm"
                      >
                        {person.name}
                        {person.title && (
                          <span className="text-purple-400">({person.title})</span>
                        )}
                        <button
                          onClick={() => handleRemovePerson(person.id)}
                          className="ml-1 text-purple-400 hover:text-purple-600"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Tags Section */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Tag size={18} className="text-slate-500" />
                    <span className="font-medium text-slate-700">Topics to Track</span>
                    <span className="text-xs text-slate-400">
                      ({ownerDetails?.tags?.length || 0} selected)
                    </span>
                  </div>

                  <div className="space-y-3">
                    {['universal', 'pe', 'industrials'].map((category) => {
                      const categoryTags = tags.filter((t) => t.category === category);
                      if (categoryTags.length === 0) return null;
                      return (
                        <div key={category}>
                          <div className="text-xs font-semibold text-slate-400 uppercase mb-2">
                            {category === 'pe' ? 'PE-Specific' : category.charAt(0).toUpperCase() + category.slice(1)}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {categoryTags.map((tag) => {
                              const isSelected = ownerDetails?.tags?.some((t) => t.id === tag.id);
                              return (
                                <button
                                  key={tag.id}
                                  onClick={() => handleToggleTag(tag.id)}
                                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                                    isSelected
                                      ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300'
                                      : 'bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200'
                                  }`}
                                >
                                  {tag.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Save Button */}
                {(validCompanyInputs.length > 0 || validPersonInputs.length > 0) && (
                  <div className="pt-4 border-t border-slate-100">
                    <button
                      onClick={handleSaveChanges}
                      disabled={saving}
                      className="w-full px-4 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={18} />
                          Save Changes
                          <span className="bg-white/20 px-2 py-0.5 rounded text-sm">
                            {validCompanyInputs.length + validPersonInputs.length} items
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-sm text-slate-500">Total Revenue Owners</div>
          <div className="text-2xl font-bold text-slate-900">{owners.length}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-sm text-slate-500">Available Tags</div>
          <div className="text-2xl font-bold text-slate-900">{tags.length}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-sm text-slate-500">Ready for News Fetch</div>
          <div className="text-2xl font-bold text-slate-900">
            {owners.filter((o) => (o._count?.companies || 0) > 0 || (o._count?.people || 0) > 0).length}
          </div>
        </div>
      </div>
    </div>
  );
};
