import React, { useState } from 'react';
import { Button, Dropdown, Modal, Form, Input, message } from 'antd';
import { PlusOutlined, ApiOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { modelConfigManager, type ModelConfig } from '~libs/chatbot/ModelConfigManager';
import { useAPIModel } from '~provider/APIModelProvider';

interface QuickAddAPIModelProps {
    onSuccess?: (config: ModelConfig) => void;
    className?: string;
    size?: 'small' | 'middle' | 'large';
    type?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
}

export const QuickAddAPIModel: React.FC<QuickAddAPIModelProps> = ({
    onSuccess,
    className = '',
    size = 'middle',
    type = 'dashed'
}) => {
    const [showQuickForm, setShowQuickForm] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<Partial<ModelConfig> | null>(null);
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const { loadConfigs } = useAPIModel();

    const quickTemplates = [
        {
            key: 'gpt-4',
            label: 'GPT-4',
            icon: '🤖',
            template: {
                name: 'GPT-4',
                provider: 'openai' as const,
                mode: 'api' as const,
                model: 'gpt-4',
                baseUrl: 'https://api.openai.com/v1',
                maxTokens: 8000,
                temperature: 0.7,
                supportsMCP: true,
                description: 'OpenAI GPT-4 model with tool calling support'
            }
        },
        {
            key: 'gpt-3.5-turbo',
            label: 'GPT-3.5 Turbo',
            icon: '⚡',
            template: {
                name: 'GPT-3.5 Turbo',
                provider: 'openai' as const,
                mode: 'api' as const,
                model: 'gpt-3.5-turbo',
                baseUrl: 'https://api.openai.com/v1',
                maxTokens: 4000,
                temperature: 0.7,
                supportsMCP: true,
                description: 'OpenAI GPT-3.5 Turbo with tool calling support'
            }
        },
        {
            key: 'claude-3-haiku',
            label: 'Claude 3 Haiku',
            icon: '🎭',
            template: {
                name: 'Claude 3 Haiku',
                provider: 'claude' as const,
                mode: 'api' as const,
                model: 'claude-3-haiku-20240307',
                baseUrl: 'https://api.anthropic.com',
                maxTokens: 4000,
                temperature: 0.7,
                supportsMCP: true,
                description: 'Anthropic Claude 3 Haiku model'
            }
        },
        {
            key: 'custom',
            label: 'Custom Model',
            icon: '🔧',
            template: {
                name: '',
                provider: 'custom' as const,
                mode: 'api' as const,
                model: '',
                baseUrl: '',
                maxTokens: 4000,
                temperature: 0.7,
                supportsMCP: true,
                description: 'Custom API model configuration'
            }
        }
    ];

    const handleTemplateSelect = (template: Partial<ModelConfig>) => {
        setSelectedTemplate(template);
        form.setFieldsValue({
            name: template.name,
            provider: template.provider,
            model: template.model,
            baseUrl: template.baseUrl,
            maxTokens: template.maxTokens,
            temperature: template.temperature,
            supportsMCP: template.supportsMCP,
            description: template.description
        });
        setShowQuickForm(true);
    };

    const handleSubmit = async (values: any) => {
        setLoading(true);
        try {
            const configData = {
                name: values.name,
                provider: selectedTemplate?.provider || 'openai',
                mode: 'api' as const,
                model: values.model,
                apiKey: values.apiKey,
                baseUrl: values.baseUrl,
                maxTokens: values.maxTokens || 4000,
                temperature: values.temperature || 0.7,
                supportsMCP: values.supportsMCP ?? true,
                description: values.description
            };

            const result = await modelConfigManager.addConfig(configData);
            message.success('API模型配置添加成功');

            // 重新加载配置
            await loadConfigs();

            // 关闭表单
            setShowQuickForm(false);
            form.resetFields();
            setSelectedTemplate(null);

            // 回调
            onSuccess?.(result);

        } catch (error) {
            message.error(error.message || '添加失败');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setShowQuickForm(false);
        form.resetFields();
        setSelectedTemplate(null);
    };

    const dropdownItems = quickTemplates.map(template => ({
        key: template.key,
        label: (
            <div
                className="flex items-center gap-2 py-1"
                onClick={() => handleTemplateSelect(template.template)}
            >
                <span className="text-lg">{template.icon}</span>
                <div className="flex flex-col">
                    <span className="font-medium">{template.label}</span>
                    <span className="text-xs text-gray-500">
                        {template.template.provider} • {template.template.model}
                    </span>
                </div>
            </div>
        )
    }));

    return (
        <>
            <Dropdown
                menu={{ items: dropdownItems }}
                placement="bottomLeft"
                trigger={['click']}
            >
                <Button
                    type={type}
                    size={size}
                    icon={<PlusOutlined />}
                    className={className}
                >
                    Quick Add API Model
                </Button>
            </Dropdown>

            <Modal
                title={
                    <div className="flex items-center gap-2">
                        <ApiOutlined className="text-blue-500" />
                        <span>Quick Add: {selectedTemplate?.name || 'API Model'}</span>
                    </div>
                }
                open={showQuickForm}
                onCancel={handleCancel}
                footer={null}
                width={500}
                destroyOnClose
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    className="mt-4"
                >
                    <Form.Item
                        label="Model Name"
                        name="name"
                        rules={[{ required: true, message: 'Please enter model name' }]}
                    >
                        <Input placeholder="e.g., My GPT-4" />
                    </Form.Item>

                    <Form.Item
                        label="Model Identifier"
                        name="model"
                        rules={[{ required: true, message: 'Please enter model identifier' }]}
                    >
                        <Input placeholder="e.g., gpt-4, claude-3-haiku-20240307" />
                    </Form.Item>

                    <Form.Item
                        label="API Key"
                        name="apiKey"
                        rules={[{ required: true, message: 'Please enter API key' }]}
                    >
                        <Input.Password placeholder="sk-..." />
                    </Form.Item>

                    <Form.Item
                        label="Base URL (Optional)"
                        name="baseUrl"
                    >
                        <Input placeholder="e.g., https://api.openai.com/v1" />
                    </Form.Item>

                    <Form.Item
                        label="Description (Optional)"
                        name="description"
                    >
                        <Input.TextArea
                            rows={2}
                            placeholder="Brief description of this model configuration"
                        />
                    </Form.Item>

                    <div className="flex items-center gap-2 mb-4 p-3 bg-green-50 rounded-lg">
                        <ThunderboltOutlined className="text-green-600" />
                        <span className="text-sm text-green-700">
                            MCP tools will be enabled for this model
                        </span>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button onClick={handleCancel}>
                            Cancel
                        </Button>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            icon={<PlusOutlined />}
                        >
                            Add Model
                        </Button>
                    </div>
                </Form>
            </Modal>
        </>
    );
};

// 紧凑版本，只显示图标
export const CompactQuickAddAPIModel: React.FC<{
    onSuccess?: (config: ModelConfig) => void;
    className?: string;
}> = ({ onSuccess, className = '' }) => {
    return (
        <QuickAddAPIModel
            onSuccess={onSuccess}
            className={className}
            size="small"
            type="text"
        />
    );
};
