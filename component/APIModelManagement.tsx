import React, { useState, useEffect } from 'react';
import {
    Card,
    Table,
    Button,
    Space,
    Tag,
    Tooltip,
    Popconfirm,
    message,
    Input,
    Select,
    Switch,
    Typography,
    Divider,
    Empty,
    Badge
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    SearchOutlined,
    ApiOutlined,
    ToolOutlined,
    EyeOutlined,
    SettingOutlined,
    ThunderboltOutlined
} from '@ant-design/icons';
import { useAPIModel } from '~provider/APIModelProvider';
import { modelConfigManager, type ModelConfig } from '~libs/chatbot/ModelConfigManager';
import { AddModelConfigForm } from './AddModelConfigForm';
import { QuickAddAPIModel } from './QuickAddAPIModel';
import { APIModelIndicator } from './APIModelIndicator';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

interface APIModelManagementProps {
    className?: string;
}

export const APIModelManagement: React.FC<APIModelManagementProps> = ({ className = '' }) => {
    const {
        apiConfigs,
        selectedConfigs,
        loadConfigs,
        selectConfig,
        unselectConfig,
        isConfigSelected,
        loading,
        error
    } = useAPIModel();

    const [showAddForm, setShowAddForm] = useState(false);
    const [editingConfig, setEditingConfig] = useState<ModelConfig | null>(null);
    const [searchText, setSearchText] = useState('');
    const [filterProvider, setFilterProvider] = useState<string>('all');
    const [filterMCP, setFilterMCP] = useState<boolean | null>(null);
    const [testingConnections, setTestingConnections] = useState<Set<string>>(new Set());

    useEffect(() => {
        loadConfigs();
    }, []);

    // 过滤配置
    const filteredConfigs = apiConfigs.filter(config => {
        const matchesSearch = !searchText ||
            config.name.toLowerCase().includes(searchText.toLowerCase()) ||
            config.model.toLowerCase().includes(searchText.toLowerCase()) ||
            config.description?.toLowerCase().includes(searchText.toLowerCase());

        const matchesProvider = filterProvider === 'all' || config.provider === filterProvider;
        const matchesMCP = filterMCP === null || config.supportsMCP === filterMCP;

        return matchesSearch && matchesProvider && matchesMCP;
    });

    const handleEdit = (config: ModelConfig) => {
        setEditingConfig(config);
        setShowAddForm(true);
    };

    const handleDelete = async (config: ModelConfig) => {
        try {
            await modelConfigManager.deleteConfig(config.id);
            message.success('模型配置删除成功');

            // 如果被删除的配置在选中列表中，移除它
            if (isConfigSelected(config)) {
                unselectConfig(config);
            }

            await loadConfigs();
        } catch (error) {
            message.error('删除失败: ' + error.message);
        }
    };

    const handleTestConnection = async (config: ModelConfig) => {
        setTestingConnections(prev => new Set(prev).add(config.id));

        try {
            const result = await modelConfigManager.testConnection(config);
            if (result.success) {
                message.success(`${config.name} 连接测试成功`);
            } else {
                message.error(`${config.name} 连接测试失败: ${result.error}`);
            }
        } catch (error) {
            message.error(`连接测试失败: ${error.message}`);
        } finally {
            setTestingConnections(prev => {
                const newSet = new Set(prev);
                newSet.delete(config.id);
                return newSet;
            });
        }
    };

    const handleToggleSelection = (config: ModelConfig, selected: boolean) => {
        if (selected) {
            selectConfig(config);
        } else {
            unselectConfig(config);
        }
    };

    const handleFormSuccess = async () => {
        await loadConfigs();
        setShowAddForm(false);
        setEditingConfig(null);
    };

    const handleFormClose = () => {
        setShowAddForm(false);
        setEditingConfig(null);
    };

    const getProviderColor = (provider: string) => {
        switch (provider) {
            case 'openai': return 'green';
            case 'claude': return 'orange';
            case 'gemini': return 'blue';
            default: return 'default';
        }
    };

    const formatTokenLimit = (tokens: number) => {
        return `${Math.round(tokens / 1000)}k`;
    };

    const columns = [
        {
            title: '选择',
            key: 'select',
            width: 60,
            render: (_, config: ModelConfig) => (
                <Switch
                    size="small"
                    checked={isConfigSelected(config)}
                    onChange={(checked) => handleToggleSelection(config, checked)}
                />
            )
        },
        {
            title: '模型名称',
            key: 'name',
            render: (_, config: ModelConfig) => (
                <div className="flex items-center gap-2">
                    <img
                        src={config.logoSrc}
                        alt={config.provider}
                        className="w-5 h-5"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                    <div>
                        <div className="font-medium">{config.name}</div>
                        <div className="text-xs text-gray-500">{config.model}</div>
                    </div>
                </div>
            )
        },
        {
            title: '提供商',
            key: 'provider',
            width: 100,
            render: (_, config: ModelConfig) => (
                <Tag color={getProviderColor(config.provider)}>
                    {config.provider.toUpperCase()}
                </Tag>
            )
        },
        {
            title: '功能',
            key: 'features',
            width: 120,
            render: (_, config: ModelConfig) => (
                <div className="flex flex-col gap-1">
                    <Tag color="blue">
                        <ApiOutlined /> API
                    </Tag>
                    {config.supportsMCP && (
                        <Tag color="green">
                            <ToolOutlined /> MCP
                        </Tag>
                    )}
                </div>
            )
        },
        {
            title: '配置',
            key: 'config',
            width: 120,
            render: (_, config: ModelConfig) => (
                <div className="text-xs text-gray-500">
                    <div>Tokens: {formatTokenLimit(config.maxTokens)}</div>
                    <div>Temp: {config.temperature}</div>
                </div>
            )
        },
        {
            title: '状态',
            key: 'status',
            width: 80,
            render: (_, config: ModelConfig) => (
                <div className="flex flex-col gap-1">
                    {isConfigSelected(config) && (
                        <Badge status="success" text="已选择" />
                    )}
                    <Badge
                        status={config.apiKey ? "processing" : "warning"}
                        text={config.apiKey ? "已配置" : "待配置"}
                    />
                </div>
            )
        },
        {
            title: '操作',
            key: 'actions',
            width: 150,
            render: (_, config: ModelConfig) => (
                <Space size="small">
                    <Tooltip title="测试连接">
                        <Button
                            type="text"
                            size="small"
                            icon={<ThunderboltOutlined />}
                            loading={testingConnections.has(config.id)}
                            onClick={() => handleTestConnection(config)}
                        />
                    </Tooltip>
                    <Tooltip title="编辑">
                        <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => handleEdit(config)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="确认删除"
                        description="确定要删除这个API模型配置吗？"
                        onConfirm={() => handleDelete(config)}
                        okText="删除"
                        cancelText="取消"
                    >
                        <Tooltip title="删除">
                            <Button
                                type="text"
                                size="small"
                                icon={<DeleteOutlined />}
                                danger
                            />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    if (error) {
        return (
            <Card className={className}>
                <div className="text-center py-8">
                    <Text type="danger">加载失败: {error}</Text>
                    <br />
                    <Button type="primary" onClick={loadConfigs} className="mt-2">
                        重试
                    </Button>
                </div>
            </Card>
        );
    }

    return (
        <div className={className}>
            {/* 头部信息 */}
            <Card className="mb-4">
                <div className="flex justify-between items-start">
                    <div>
                        <Title level={4} className="mb-2 flex items-center gap-2">
                            <ApiOutlined className="text-blue-500" />
                            API Models Management
                        </Title>
                        <Text type="secondary">
                            管理您的API模型配置，支持OpenAI、Claude、Gemini等多种提供商
                        </Text>
                    </div>
                    <APIModelIndicator className="ml-4" />
                </div>
            </Card>

            {/* 操作栏 */}
            <Card className="mb-4">
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <div className="flex items-center gap-4 flex-wrap">
                        <Search
                            placeholder="搜索模型名称、标识或描述"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            style={{ width: 250 }}
                            allowClear
                        />

                        <Select
                            value={filterProvider}
                            onChange={setFilterProvider}
                            style={{ width: 120 }}
                        >
                            <Option value="all">所有提供商</Option>
                            <Option value="openai">OpenAI</Option>
                            <Option value="claude">Claude</Option>
                            <Option value="gemini">Gemini</Option>
                            <Option value="custom">Custom</Option>
                        </Select>

                        <Select
                            value={filterMCP}
                            onChange={setFilterMCP}
                            style={{ width: 120 }}
                        >
                            <Option value={null}>所有模型</Option>
                            <Option value={true}>支持MCP</Option>
                            <Option value={false}>不支持MCP</Option>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2">
                        <QuickAddAPIModel onSuccess={handleFormSuccess} />
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setShowAddForm(true)}
                        >
                            添加模型
                        </Button>
                    </div>
                </div>
            </Card>

            {/* 模型列表 */}
            <Card>
                {filteredConfigs.length === 0 ? (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            apiConfigs.length === 0
                                ? "还没有配置任何API模型"
                                : "没有找到匹配的模型"
                        }
                    >
                        {apiConfigs.length === 0 && (
                            <div className="flex gap-2 justify-center">
                                <QuickAddAPIModel
                                    onSuccess={handleFormSuccess}
                                    type="primary"
                                />
                                <Button onClick={() => setShowAddForm(true)}>
                                    手动添加
                                </Button>
                            </div>
                        )}
                    </Empty>
                ) : (
                    <Table
                        columns={columns}
                        dataSource={filteredConfigs}
                        rowKey="id"
                        loading={loading}
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showQuickJumper: true,
                            showTotal: (total, range) =>
                                `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
                        }}
                        scroll={{ x: 800 }}
                    />
                )}
            </Card>

            {/* 添加/编辑表单 */}
            <AddModelConfigForm
                visible={showAddForm}
                onClose={handleFormClose}
                onSuccess={handleFormSuccess}
                editConfig={editingConfig}
            />
        </div>
    );
};
