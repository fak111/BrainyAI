import React from 'react';
import { Badge, Tooltip, Tag } from 'antd';
import { ToolOutlined, ApiOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useSelectedAPIModels, useHasAPIModels } from '~provider/APIModelProvider';
import { type ModelConfig } from '~libs/chatbot/ModelConfigManager';

interface APIModelIndicatorProps {
    className?: string;
    showDetails?: boolean;
}

export const APIModelIndicator: React.FC<APIModelIndicatorProps> = ({
    className = '',
    showDetails = true
}) => {
    const selectedModels = useSelectedAPIModels();
    const { hasModels, loading } = useHasAPIModels();

    if (loading) {
        return (
            <div className={`flex items-center ${className}`}>
                <div className="animate-pulse">
                    <div className="h-4 w-16 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    if (!hasModels || selectedModels.length === 0) {
        return null;
    }

    const mcpEnabledCount = selectedModels.filter(model => model.supportsMCP).length;
    const totalSelected = selectedModels.length;

    if (!showDetails) {
        return (
            <div className={`flex items-center gap-1 ${className}`}>
                <Badge count={totalSelected} size="small">
                    <ApiOutlined className="text-blue-500" />
                </Badge>
                {mcpEnabledCount > 0 && (
                    <Badge count={mcpEnabledCount} size="small">
                        <ToolOutlined className="text-green-500" />
                    </Badge>
                )}
            </div>
        );
    }

    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">API Models:</span>
                <Badge count={totalSelected} size="small">
                    <ApiOutlined className="text-blue-500" />
                </Badge>
            </div>

            <div className="flex flex-wrap gap-1">
                {selectedModels.map((model) => (
                    <ModelTag key={model.id} model={model} />
                ))}
            </div>

            {mcpEnabledCount > 0 && (
                <div className="flex items-center gap-1 text-xs text-green-600">
                    <ToolOutlined />
                    <span>{mcpEnabledCount} model(s) with MCP tools enabled</span>
                </div>
            )}
        </div>
    );
};

interface ModelTagProps {
    model: ModelConfig;
}

const ModelTag: React.FC<ModelTagProps> = ({ model }) => {
    const getProviderColor = (provider: string) => {
        switch (provider) {
            case 'openai':
                return '#00A67E';
            case 'claude':
                return '#FF6C37';
            case 'gemini':
                return '#4285F4';
            default:
                return '#6B7280';
        }
    };

    const formatTokenLimit = (tokens: number) => {
        return `${Math.round(tokens / 1000)}k`;
    };

    const tagContent = (
        <div className="flex items-center gap-1">
            {model.logoSrc && (
                <img
                    src={model.logoSrc}
                    alt={model.provider}
                    className="w-3 h-3"
                    onError={(e) => {
                        // 如果图片加载失败，隐藏图片
                        e.currentTarget.style.display = 'none';
                    }}
                />
            )}
            <span className="text-xs">{model.name}</span>
            {model.supportsMCP && (
                <ToolOutlined className="text-xs" />
            )}
        </div>
    );

    const tooltipContent = (
        <div className="text-xs">
            <div className="font-medium mb-1">{model.name}</div>
            <div className="text-gray-300 mb-1">
                Provider: {model.provider} | Model: {model.model}
            </div>
            <div className="text-gray-300 mb-1">
                Max Tokens: {formatTokenLimit(model.maxTokens)} | Temp: {model.temperature}
            </div>
            {model.description && (
                <div className="text-gray-300 mb-1">{model.description}</div>
            )}
            <div className="flex items-center gap-2 mt-2">
                <Tag color="green">API Mode</Tag>
                {model.supportsMCP && (
                    <Tag color="blue">
                        <ToolOutlined /> MCP Tools
                    </Tag>
                )}
            </div>
        </div>
    );

    return (
        <Tooltip title={tooltipContent} placement="top">
            <Tag
                color={getProviderColor(model.provider)}
                className="cursor-help flex items-center gap-1 px-2 py-1"
            >
                {tagContent}
            </Tag>
        </Tooltip>
    );
};

// 简化版本，用于紧凑显示
export const CompactAPIModelIndicator: React.FC<{ className?: string }> = ({ className = '' }) => {
    return <APIModelIndicator className={className} showDetails={false} />;
};

// 工具状态指示器
export const MCPToolsIndicator: React.FC<{ className?: string }> = ({ className = '' }) => {
    const selectedModels = useSelectedAPIModels();
    const mcpEnabledModels = selectedModels.filter(model => model.supportsMCP);

    if (mcpEnabledModels.length === 0) {
        return null;
    }

    return (
        <Tooltip title={`${mcpEnabledModels.length} API model(s) with MCP tools enabled`}>
            <div className={`flex items-center gap-1 text-green-600 ${className}`}>
                <ThunderboltOutlined className="text-sm" />
                <ToolOutlined className="text-sm" />
                <span className="text-xs font-medium">MCP Tools Ready</span>
            </div>
        </Tooltip>
    );
};
