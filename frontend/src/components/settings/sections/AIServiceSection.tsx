import type { SettingsPreferences } from '../useSettingsPreferences';
import { Loader2, Sparkles, ChevronDown, RefreshCw, Check } from 'lucide-react';
import { Tooltip } from '../../common/Tooltip';
import { AI_PROVIDER_OPTIONS } from '../settingsConstants';

interface AIServiceSectionProps { settings: SettingsPreferences; }

export function AIServiceSection({ settings }: AIServiceSectionProps) {
  const {
    isLoggedIn,
    publicModelDropdownRef,
    modelDropdownRef,
    apiUrlRef,
    handleApiUrlChange,
    handleApiKeyChange,
    handleModelChange,
    handleFetchModels,
    handleSelectModel,
    fetchPublicModels,
    refreshBalances,
    handleModelSourceChange,
    handleSelectPublicModel,
    selectedPublicModel,
    aiServiceApiUrl,
    aiServiceApiKey,
    aiServiceModel,
    modelSource,
    publicModelId,
    publicModels,
    publicModelsLoading,
    publicModelDropdownOpen,
    setPublicModelDropdownOpen,
    fetchingModels,
    availableModels,
    modelDropdownOpen,
    apiUrlDropdownOpen,
    setApiUrlDropdownOpen,
    t,
  } = settings;

  return (
    <section id="ai-service" className="scroll-mt-28">
    <div className="mb-6 bg-white rounded-2xl border border-gray-100 p-8">
      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-1.5">
        <Sparkles className="w-5 h-5 text-gray-500" />
        {t('aiService.title')}
      </h3>
      <p className="text-sm text-[#6b7280] mb-4">{t('aiService.desc')}</p>

      <div className="space-y-6">
        <div>
          <div className="border-t border-gray-100 mb-4" />

            <div className="space-y-6">
              {/* Model source switcher */}
              <div>
                <span className="block text-sm font-medium text-gray-700 mb-2">
                  {t('aiService.modelSource')}
                </span>
                <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
                  {isLoggedIn ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleModelSourceChange('public');
                        fetchPublicModels();
                      }}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        modelSource === 'public'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {t('aiService.publicModel')}
                    </button>
                  ) : (
                    <Tooltip content={t('aiService.publicModelLoginRequired')}>
                    <span
                      className="px-4 py-1.5 rounded-lg text-sm text-gray-400 cursor-not-allowed select-none"
                    >
                      {t('aiService.publicModel')}
                    </span>
                    </Tooltip>
                  )}
                  <button
                    type="button"
                    onClick={() => handleModelSourceChange('custom')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      modelSource === 'custom'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t('aiService.customModel')}
                  </button>
                </div>
                {!isLoggedIn ? (
                  <p className="text-xs text-amber-500 mt-1.5">
                    {t('aiService.publicModelLoginHint')}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1.5">
                    {modelSource === 'public'
                      ? t('aiService.publicModelDesc')
                      : t('aiService.customModelDesc')}
                  </p>
                )}
              </div>

              {/* Public model selector */}
              {modelSource === 'public' && (
                <div>
                  <span className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('aiService.selectPublicModel')}
                  </span>
                  <div className="relative" ref={publicModelDropdownRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setPublicModelDropdownOpen(!publicModelDropdownOpen);
                        if (publicModels.length === 0 && !publicModelsLoading) {
                          fetchPublicModels();
                        }
                      }}
                      className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white hover:border-gray-300 focus:outline-none transition-colors"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <Sparkles className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        {publicModelsLoading || (!!publicModelId && publicModels.length === 0) ? (
                          <span className="text-gray-400">{t('aiService.loadingModels')}</span>
                        ) : selectedPublicModel ? (
                          <span className="text-gray-900 font-medium truncate">{selectedPublicModel.name}</span>
                        ) : (
                          <span className="text-gray-400">{t('aiService.selectPublicModelPlaceholder')}</span>
                        )}
                      </span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {selectedPublicModel && (
                          <span className="text-xs text-gray-400 font-mono">{selectedPublicModel.model}</span>
                        )}
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${publicModelDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {/* Dropdown */}
                    {publicModelDropdownOpen && (
                      <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-xl border border-gray-200 shadow-lg shadow-gray-200/50 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                        {publicModels.length === 0 && !publicModelsLoading ? (
                          <div className="px-4 py-6 text-center">
                            <p className="text-sm text-gray-400">{t('aiService.noPublicModels')}</p>
                            <button
                              type="button"
                              onClick={fetchPublicModels}
                              className="mt-2 inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium dark:text-[#fbbf24] dark:hover:text-[#f59e0b]"
                            >
                              <RefreshCw className="w-3 h-3" />
                              {t('aiService.refreshList')}
                            </button>
                          </div>
                        ) : (
                          publicModels.map(m => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => handleSelectPublicModel(m.id, m.name)}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-gray-50 ${
                                publicModelId === m.id ? 'text-blue-600 bg-blue-50/50 dark:bg-[#fbbf24]/10 dark:text-[#fbbf24]' : 'text-gray-700'
                              }`}
                            >
                              <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                                {publicModelId === m.id ? <Check className="w-3.5 h-3.5" /> : null}
                              </span>
                              <div className="flex-1 min-w-0 text-left">
                                <div className="font-medium truncate">{m.name}</div>
                                <div className="text-xs text-gray-400 font-mono">{m.model}</div>
                              </div>
                              <div className="flex-shrink-0 text-right">
                                <div className="text-sm font-semibold text-gray-700">
                                  {m.balance > 0 ? `$${m.balance.toFixed(2)}` : '-.--'}
                                </div>
                                <div className="text-[10px] text-gray-400">{t('aiService.balance')}</div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Refresh public models button */}
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-400">
                        {selectedPublicModel
                          ? t('aiService.currentBalance', { balance: selectedPublicModel.balance > 0 ? selectedPublicModel.balance.toFixed(2) : '-.--' })
                          : t('aiService.selectPublicModelForService')}
                      </p>
                      {selectedPublicModel?.balance_updated_at && (
                        <span className="text-[10px] text-gray-300">
                          {t('aiService.lastRefreshed', { time: selectedPublicModel.balance_updated_at })}
                        </span>
                      )}
                    </div>
                    {selectedPublicModel && (
                      <button
                        type="button"
                        onClick={refreshBalances}
                        disabled={publicModelsLoading}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition-all dark:hover:bg-[#fbbf24]/10 dark:hover:text-[#fbbf24]"
                      >
                        {publicModelsLoading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        {t('aiService.refresh')}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Custom API config (only shown when model source is custom) */}
              {modelSource === 'custom' && (
              <>
              {/* AI API URL input with provider dropdown */}
              <div>
                <label htmlFor="ai-api-url" className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('aiService.apiUrl')}
                </label>
                <div className="relative" ref={apiUrlRef}>
                  <input
                    id="ai-api-url"
                    type="url"
                    value={aiServiceApiUrl}
                    onChange={(e) => handleApiUrlChange(e.target.value)}
                    onFocus={() => setApiUrlDropdownOpen(true)}
                    placeholder="https://api.openai.com/v1"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors dark:focus:ring-[#fbbf24]/30 dark:focus:border-[#fbbf24]"
                  />
                  {/* Provider dropdown - 始终渲染，CSS 控制显隐以缓存图标 */}
                  <div
                    className={`absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-xl border border-gray-200 shadow-lg shadow-gray-200/50 py-1 overflow-hidden transition-all duration-150 ${
                      apiUrlDropdownOpen
                        ? 'opacity-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 -translate-y-1 pointer-events-none'
                    }`}
                  >
                    {AI_PROVIDER_OPTIONS.map((provider) => {
                      const isSelected = aiServiceApiUrl === provider.url;
                      return (
                        <button
                          key={provider.name}
                          type="button"
                          onClick={() => {
                            handleApiUrlChange(provider.url);
                            setApiUrlDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 ${
                            isSelected ? 'bg-blue-50/50 dark:bg-[#fbbf24]/10' : ''
                          }`}
                        >
                          <img
                            src={provider.icon}
                            alt={provider.name}
                            className="w-6 h-6 rounded flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0 text-left">
                            <p className={`font-medium ${isSelected ? 'text-blue-600 dark:text-[#fbbf24]' : 'text-gray-700'}`}>
                              {provider.name}
                              {provider.tagKey && (
                                <span className="ml-1.5 inline-flex items-center px-1.5 py-px rounded-full text-[10px] font-normal bg-orange-100 text-orange-500 leading-none">
                                  {t(provider.tagKey)}
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-gray-400 truncate">{provider.url}</p>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-blue-500 flex-shrink-0 dark:text-[#fbbf24]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  {t('aiService.apiUrlDesc')}
                </p>
              </div>

              <div>
                <label htmlFor="ai-api-key" className="block text-sm font-medium text-gray-700 mb-1.5">
                  API Key
                </label>
                <input
                  id="ai-api-key"
                  type="password"
                  value={aiServiceApiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors dark:focus:ring-[#fbbf24]/30 dark:focus:border-[#fbbf24]"
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  {t('aiService.apiKeyDesc')}<span className="text-blue-500 hover:text-blue-600 cursor-pointer transition-colors dark:text-[#fbbf24] dark:hover:text-[#f59e0b]">{t('aiService.apiKeyHelpLink')}</span>
                </p>
              </div>

              <div>
                <label htmlFor="ai-model-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('aiService.modelName')}
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1" ref={modelDropdownRef}>
                    <input
                      id="ai-model-name"
                      type="text"
                      value={aiServiceModel}
                      onChange={(e) => handleModelChange(e.target.value)}
                      placeholder="gpt-3.5-turbo"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors dark:focus:ring-[#fbbf24]/30 dark:focus:border-[#fbbf24]"
                    />
                    {/* Model list dropdown */}
                    {modelDropdownOpen && availableModels.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-lg shadow-gray-200/50 py-1 z-20 animate-in fade-in zoom-in-95 origin-top duration-150">
                        {availableModels.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => handleSelectModel(m)}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                              m === aiServiceModel
                                ? 'text-blue-700 bg-blue-50 font-medium dark:bg-[#fbbf24]/10 dark:text-[#fbbf24]'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleFetchModels}
                    disabled={fetchingModels}
                    className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {fetchingModels ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    {t('aiService.fetchModels')}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  {t('aiService.fetchModelsHelp')}<a href="#" className="text-blue-500 hover:text-blue-600 ml-0.5 dark:text-[#fbbf24] dark:hover:text-[#f59e0b]">{t('aiService.officialDocs')}</a>
                </p>
              </div>

              </>
              )}
            </div>
        </div>
      </div>
    </div>
    </section>
  );
}
