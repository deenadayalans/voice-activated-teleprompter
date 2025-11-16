import { useState, useEffect } from 'react'
import { getMatchingConfig, saveMatchingConfig, MATCHING_CONFIGS, type MatchingConfig as MatchingConfigType } from '../../lib/speech-matcher'

export const MatchingConfig = () => {
  const [config, setConfig] = useState<MatchingConfigType>(MATCHING_CONFIGS.balanced)
  const [showConfig, setShowConfig] = useState(false)

  useEffect(() => {
    setConfig(getMatchingConfig())
  }, [])

  const handleConfigChange = (newConfig: MatchingConfigType) => {
    setConfig(newConfig)
    saveMatchingConfig(newConfig)
  }

  const handlePresetChange = (preset: string) => {
    if (preset in MATCHING_CONFIGS) {
      handleConfigChange(MATCHING_CONFIGS[preset])
    }
  }

  return (
    <div className="navbar-item">
      <div className="field">
        <div className="control">
          <button
            className="button is-small is-info"
            onClick={() => setShowConfig(!showConfig)}
            title="Configure speech matching algorithm"
          >
            <span className="icon is-small">
              <i className="fas fa-cog"></i>
            </span>
            <span>Matching: {config.algorithm}</span>
          </button>
        </div>
      </div>

      {showConfig && (
        <div className="modal is-active">
          <div className="modal-background" onClick={() => setShowConfig(false)}></div>
          <div className="modal-card">
            <header className="modal-card-head">
              <p className="modal-card-title">Speech Matching Configuration</p>
              <button
                className="delete"
                onClick={() => setShowConfig(false)}
              ></button>
            </header>
            <section className="modal-card-body">
              <div className="field">
                <label className="label">Algorithm Preset</label>
                <div className="control">
                  <div className="select is-fullwidth">
                    <select
                      value={config.algorithm}
                      onChange={(e) => handlePresetChange(e.target.value)}
                    >
                      <option value="conservative">Conservative (3-4 words, 70% similarity)</option>
                      <option value="fourWord">4-Word (4 words, 80% similarity)</option>
                      <option value="balanced">Balanced (2-3 words, 60% similarity)</option>
                      <option value="aggressive">Aggressive (1-2 words, 50% similarity)</option>
                      <option value="custom">Custom Settings</option>
                    </select>
                  </div>
                </div>
                <p className="help">
                  <strong>Conservative:</strong> Most accurate, requires longer phrases<br/>
                  <strong>4-Word:</strong> Ultra-accurate, requires exactly 4 words<br/>
                  <strong>Balanced:</strong> Good balance of accuracy and responsiveness<br/>
                  <strong>Aggressive:</strong> Most responsive, may have more false matches
                </p>
              </div>

              {config.algorithm === 'custom' && (
                <>
                  <div className="field">
                    <label className="label">Minimum Words</label>
                    <div className="control">
                      <input
                        className="input"
                        type="number"
                        min="1"
                        max="5"
                        value={config.minWords}
                        onChange={(e) => handleConfigChange({
                          ...config,
                          minWords: parseInt(e.target.value)
                        })}
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label className="label">Maximum Words</label>
                    <div className="control">
                      <input
                        className="input"
                        type="number"
                        min="1"
                        max="5"
                        value={config.maxWords}
                        onChange={(e) => handleConfigChange({
                          ...config,
                          maxWords: parseInt(e.target.value)
                        })}
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label className="label">Search Range</label>
                    <div className="control">
                      <input
                        className="input"
                        type="range"
                        min="1"
                        max="8"
                        step="1"
                        value={config.searchRangeMultiplier}
                        onChange={(e) => handleConfigChange({
                          ...config,
                          searchRangeMultiplier: parseInt(e.target.value)
                        })}
                      />
                      <p className="help">Lookahead multiplier: {config.searchRangeMultiplier}×</p>
                    </div>
                  </div>

                  <div className="field">
                    <label className="label">Similarity Threshold</label>
                    <div className="control">
                      <input
                        className="input"
                        type="range"
                        min="0.3"
                        max="0.9"
                        step="0.1"
                        value={config.similarityThreshold}
                        onChange={(e) => handleConfigChange({
                          ...config,
                          similarityThreshold: parseFloat(e.target.value)
                        })}
                      />
                      <p className="help">Current: {Math.round(config.similarityThreshold * 100)}%</p>
                    </div>
                  </div>

                  <div className="field">
                    <div className="control">
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          checked={config.allowSingleWords}
                          onChange={(e) => handleConfigChange({
                            ...config,
                            allowSingleWords: e.target.checked
                          })}
                        />
                        Allow single word matches
                      </label>
                    </div>
                  </div>

                  <div className="field">
                    <div className="control">
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          checked={config.normalizeDiacritics}
                          onChange={(e) => handleConfigChange({
                            ...config,
                            normalizeDiacritics: e.target.checked
                          })}
                        />
                        Diacritic-insensitive matching (better cross-accent performance)
                      </label>
                    </div>
                  </div>

                  <div className="field">
                    <div className="control">
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          checked={config.ignorePunctuation}
                          onChange={(e) => handleConfigChange({
                            ...config,
                            ignorePunctuation: e.target.checked
                          })}
                        />
                        Ignore punctuation (treats “word,” and “word” the same)
                      </label>
                    </div>
                  </div>

                  <div className="field">
                    <div className="control">
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          checked={config.strictNextWord}
                          onChange={(e) => handleConfigChange({
                            ...config,
                            strictNextWord: e.target.checked
                          })}
                        />
                        Strict next-word progression (prevents jumps, safer in noisy rooms)
                      </label>
                    </div>
                  </div>

                  <div className="field">
                    <div className="control">
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          checked={config.smallWordsRequireMore}
                          onChange={(e) => handleConfigChange({
                            ...config,
                            smallWordsRequireMore: e.target.checked
                          })}
                        />
                        Small words require more context
                      </label>
                    </div>
                  </div>
                </>
              )}
            </section>
            <footer className="modal-card-foot">
              <button className="button is-success" onClick={() => setShowConfig(false)}>
                Done
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}
