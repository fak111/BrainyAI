import React, { createContext, useContext, useEffect, useState } from 'react';
import { Storage } from '@plasmohq/storage';
import { modelConfigManager, type ModelConfig } from '~libs/chatbot/ModelConfigManager';
import { createAPIBot, type APIBotBase } from '~libs/chatbot/APIBotBase';
import { Logger } from '~utils/logger';

interface APIModelContextType {
    // 配置管理
    apiConfigs: ModelConfig[];
    selectedConfigs: ModelConfig[];
    loadConfigs: () => Promise<void>;

    // 选择管理
    selectConfig: (config: ModelConfig) => void;
    unselectConfig: (config: ModelConfig) => void;
    isConfigSelected: (config: ModelConfig) => boolean;

    // Bot实例管理
    createBotInstance: (config: ModelConfig, conversationId: string) => APIBotBase;

    // 状态
    loading: boolean;
    error: string | null;
}

const APIModelContext = createContext<APIModelContextType | null>(null);

export const useAPIModel = () => {
    const context = useContext(APIModelContext);
    if (!context) {
        throw new Error('useAPIModel must be used within APIModelProvider');
    }
    return context;
};

interface APIModelProviderProps {
    children: React.ReactNode;
}

export const APIModelProvider: React.FC<APIModelProviderProps> = ({ children }) => {
    const [apiConfigs, setApiConfigs] = useState<ModelConfig[]>([]);
    const [selectedConfigs, setSelectedConfigs] = useState<ModelConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const storage = new Storage();
    const SELECTED_CONFIGS_KEY = 'selected_api_configs';

    useEffect(() => {
        initializeProvider();
    }, []);

    const initializeProvider = async () => {
        try {
            setLoading(true);
            setError(null);

            // 加载配置
            await loadConfigs();

            // 加载选中的配置
            await loadSelectedConfigs();

        } catch (err) {
            Logger.error('Failed to initialize API model provider:', err);
            setError(err.message || 'Failed to initialize API models');
        } finally {
            setLoading(false);
        }
    };

    const loadConfigs = async () => {
        try {
            const configs = await modelConfigManager.listConfigs();
            setApiConfigs(configs);
            Logger.log('Loaded API configs:', configs.length);
        } catch (err) {
            Logger.error('Failed to load API configs:', err);
            throw err;
        }
    };

    const loadSelectedConfigs = async () => {
        try {
            const selectedIds = await storage.get<string[]>(SELECTED_CONFIGS_KEY);
            if (selectedIds && Array.isArray(selectedIds)) {
                const selected = apiConfigs.filter(config => selectedIds.includes(config.id));
                setSelectedConfigs(selected);
                Logger.log('Loaded selected configs:', selected.length);
            }
        } catch (err) {
            Logger.error('Failed to load selected configs:', err);
            // 不抛出错误，使用默认值
        }
    };

    const saveSelectedConfigs = async (configs: ModelConfig[]) => {
        try {
            const configIds = configs.map(config => config.id);
            await storage.set(SELECTED_CONFIGS_KEY, configIds);
            Logger.log('Saved selected configs:', configIds);
        } catch (err) {
            Logger.error('Failed to save selected configs:', err);
        }
    };

    const selectConfig = (config: ModelConfig) => {
        setSelectedConfigs(prev => {
            // 避免重复选择
            if (prev.some(c => c.id === config.id)) {
                return prev;
            }

            // 限制最多选择3个
            let newSelected;
            if (prev.length >= 3) {
                newSelected = [...prev.slice(1), config];
            } else {
                newSelected = [...prev, config];
            }

            // 异步保存
            saveSelectedConfigs(newSelected);

            return newSelected;
        });
    };

    const unselectConfig = (config: ModelConfig) => {
        setSelectedConfigs(prev => {
            // 至少保留一个选中的配置
            if (prev.length <= 1) {
                return prev;
            }

            const newSelected = prev.filter(c => c.id !== config.id);

            // 异步保存
            saveSelectedConfigs(newSelected);

            return newSelected;
        });
    };

    const isConfigSelected = (config: ModelConfig): boolean => {
        return selectedConfigs.some(c => c.id === config.id);
    };

    const createBotInstance = (config: ModelConfig, conversationId: string): APIBotBase => {
        try {
            return createAPIBot(config, conversationId);
        } catch (err) {
            Logger.error('Failed to create bot instance:', err);
            throw new Error(`Failed to create ${config.provider} bot: ${err.message}`);
        }
    };

    // 当apiConfigs更新时，重新加载选中的配置
    useEffect(() => {
        if (apiConfigs.length > 0) {
            loadSelectedConfigs();
        }
    }, [apiConfigs]);

    const contextValue: APIModelContextType = {
        apiConfigs,
        selectedConfigs,
        loadConfigs,
        selectConfig,
        unselectConfig,
        isConfigSelected,
        createBotInstance,
        loading,
        error
    };

    return (
        <APIModelContext.Provider value={contextValue}>
            {children}
        </APIModelContext.Provider>
    );
};

// 便捷的Hook，用于获取选中的API模型
export const useSelectedAPIModels = () => {
    const { selectedConfigs } = useAPIModel();
    return selectedConfigs;
};

// 便捷的Hook，用于检查是否有可用的API模型
export const useHasAPIModels = () => {
    const { apiConfigs, loading } = useAPIModel();
    return { hasModels: apiConfigs.length > 0, loading };
};
