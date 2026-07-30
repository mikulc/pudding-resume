import type { SettingsPreferences } from '../useSettingsPreferences';
import { Loader2, Sparkles, RefreshCw, Check } from 'lucide-react';
import { AI_PROVIDER_OPTIONS } from '../settingsConstants';

interface AIServiceSectionProps { settings: SettingsPreferences; }

export function AIServiceSection({ settings }: AIServiceSectionProps) {
  const {
    modelDropdownRef,
    apiUrlRef,
    handleApiUrlChange,
    handleApiKeyChange,
    handleModelChange,
    handleFetchModels,
    handleSelectModel,
    aiServiceApiUrl,
    aiServiceApiKey,
    aiServiceModel,
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
              </div>

            </div>
        </div>
      </div>
    </div>
    </section>
  );
}
