import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Switch, Slider, Button, message, Tooltip, Tabs } from 'antd';
import { InfoCircleOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import { modelConfigManager, type ModelConfig } from '~libs/chatbot/ModelConfigManager';
import { Logger } from '~utils/logger';

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

interface AddModelConfigFormProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: (config: ModelConfig) => void;
    editConfig?: ModelConfig | null;
}

export const AddModelConfigForm: React.FC<AddModelConfigFormProps> = ({
    visible,
    onClose,
    onSuccess,
    editConfig
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [testingConnection, setTestingConnection] = useState(false);
    const [activeTab, setActiveTab] = useState('basic');

    useEffect(() => {
        if (visible) {
            if (editConfig) {
                // 编辑模式，填充表单
                form.setFieldsValue({
                    name: editConfig.name,
                    provider: editConfig.provider,
                    mode: editConfig.mode,
                    model: editConfig.model,
                    apiKey: editConfig.apiKey,
                    baseUrl: editConfig.baseUrl,
                    maxTokens: editConfig.maxTokens,
                    temperature: editConfig.temperature,
                    supportsMCP: editConfig.supportsMCP,
                    description: editConfig.description
                });
            } else {
                // 新增模式，重置表单
                form.resetFields();
                form.setFieldsValue({
                    mode: 'api',
                    provider: 'openai',
                    maxTokens: 4000,
                    temperature: 0.7,
                    supportsMCP: true
                });
            }
        }
    }, [visible, editConfig, form]);

    const handleSubmit = async (values: any) => {
        setLoading(true);
        try {
            const configData = {
                name: values.name,
                provider: values.provider,
                mode: values.mode,
                model: values.model,
                apiKey: values.apiKey,
                baseUrl: values.baseUrl,
                maxTokens: values.maxTokens,
                temperature: values.temperature,
                supportsMCP: values.supportsMCP,
                description: values.description
            };

            let result: ModelConfig;
            if (editConfig) {
                result = await modelConfigManager.updateConfig(editConfig.id, configData);
                message.success('模型配置更新成功');
            } else {
                result = await modelConfigManager.addConfig(configData);
                message.success('模型配置添加成功');
            }

            onSuccess(result);
            onClose();
        } catch (error) {
            Logger.error('Failed to save model config:', error);
            message.error(error.message || '保存失败');
        } finally {
            setLoading(false);
        }
    };

    const handleTestConnection = async () => {
        try {
            const values = await form.validateFields(['apiKey', 'baseUrl', 'provider', 'model']);
            setTestingConnection(true);

            const testConfig: ModelConfig = {
                id: 'test',
                name: 'test',
                provider: values.provider,
                mode: 'api',
                model: values.model,
                apiKey: values.apiKey,
                baseUrl: values.baseUrl,
                maxTokens: 4000,
                temperature: 0.7,
                supportsMCP: false,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await modelConfigManager.testConnection(testConfig);
            if (result.success) {
                message.success('连接测试成功');
            } else {
                message.error(`连接测试失败: ${result.error}`);
            }
        } catch (error) {
            if (error.errorFields) {
                message.error('请先填写必要的连接信息');
            } else {
                message.error('连接测试失败');
            }
        } finally {
            setTestingConnection(false);
        }
    };

    const loadPresetTemplate = (template: Partial<ModelConfig>) => {
        form.setFieldsValue({
            name: template.name,
            provider: template.provider,
            mode: template.mode,
            model: template.model,
            baseUrl: template.baseUrl,
            maxTokens: template.maxTokens,
            temperature: template.temperature,
            supportsMCP: template.supportsMCP,
            description: template.description
        });
        message.success('模板加载成功');
    };

    const presetTemplates = modelConfigManager.getPresetTemplates();

    return (
        <Modal
            title={editConfig ? '编辑模型配置' : '添加API模型配置'}
            open={visible}
            onCancel={onClose}
            footer={null}
            width={600}
            destroyOnClose
        >
            <Tabs activeKey={activeTab} onChange={setActiveTab}>
                <TabPane tab="基础配置" key="basic">
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSubmit}
                        initialValues={{
                            mode: 'api',
                            provider: 'openai',
                            maxTokens: 4000,
                            temperature: 0.7,
                            supportsMCP: true
                        }}
                    >
                        <Form.Item
                            label="模型名称"
                            name="name"
                            rules={[{ required: true, message: '请输入模型名称' }]}
                        >
                            <Input placeholder="例如: My GPT-4" />
                        </Form.Item>

                        <Form.Item
                            label="提供商"
                            name="provider"
                            rules={[{ required: true, message: '请选择提供商' }]}
                        >
                            <Select>
                                <Option value="openai">OpenAI</Option>
                                <Option value="claude">Anthropic (Claude)</Option>
                                <Option value="gemini">Google (Gemini)</Option>
                                <Option value="custom">自定义</Option>
                            </Select>
                        </Form.Item>

                        <Form.Item
                            label="模式"
                            name="mode"
                            rules={[{ required: true, message: '请选择模式' }]}
                        >
                            <Select disabled>
                                <Option value="api">API模式 (支持工具调用)</Option>
                                <Option value="web">Web模式 (基础功能)</Option>
                            </Select>
                        </Form.Item>

                        <Form.Item
                            label="模型标识"
                            name="model"
                            rules={[{ required: true, message: '请输入模型标识' }]}
                        >
                            <Input placeholder="例如: gpt-4, claude-3-haiku-20240307" />
                        </Form.Item>

                        <Form.Item
                            label={
                                <span>
                                    API Key
                                    <Tooltip title="您的API密钥将被安全存储在本地">
                                        <InfoCircleOutlined style={{ marginLeft: 4 }} />
                                    </Tooltip>
                                </span>
                            }
                            name="apiKey"
                            rules={[{ required: true, message: '请输入API Key' }]}
                        >
                            <Input.Password
                                placeholder="sk-..."
                                iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                            />
                        </Form.Item>

                        <Form.Item
                            label={
                                <span>
                                    Base URL
                                    <Tooltip title="API的基础URL，留空使用默认值">
                                        <InfoCircleOutlined style={{ marginLeft: 4 }} />
                                    </Tooltip>
                                </span>
                            }
                            name="baseUrl"
                        >
                            <Input placeholder="例如: https://api.openai.com/v1" />
                        </Form.Item>

                        <Form.Item
                            label="描述"
                            name="description"
                        >
                            <TextArea rows={2} placeholder="模型的简短描述（可选）" />
                        </Form.Item>

                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            <Button
                                type="default"
                                onClick={handleTestConnection}
                                loading={testingConnection}
                                disabled={loading}
                            >
                                测试连接
                            </Button>
                        </div>
                    </Form>
                </TabPane>

                <TabPane tab="高级设置" key="advanced">
                    <Form form={form} layout="vertical">
                        <Form.Item
                            label={
                                <span>
                                    最大Token数
                                    <Tooltip title="单次对话的最大token限制">
                                        <InfoCircleOutlined style={{ marginLeft: 4 }} />
                                    </Tooltip>
                                </span>
                            }
                            name="maxTokens"
                        >
                            <Slider
                                min={1000}
                                max={32000}
                                step={1000}
                                marks={{
                                    1000: '1K',
                                    4000: '4K',
                                    8000: '8K',
                                    16000: '16K',
                                    32000: '32K'
                                }}
                            />
                        </Form.Item>

                        <Form.Item
                            label={
                                <span>
                                    温度 (Temperature)
                                    <Tooltip title="控制输出的随机性，0-2之间，值越高越随机">
                                        <InfoCircleOutlined style={{ marginLeft: 4 }} />
                                    </Tooltip>
                                </span>
                            }
                            name="temperature"
                        >
                            <Slider
                                min={0}
                                max={2}
                                step={0.1}
                                marks={{
                                    0: '0',
                                    0.7: '0.7',
                                    1: '1',
                                    2: '2'
                                }}
                            />
                        </Form.Item>

                        <Form.Item
                            label={
                                <span>
                                    启用MCP工具支持
                                    <Tooltip title="允许AI调用外部工具完成复杂任务">
                                        <InfoCircleOutlined style={{ marginLeft: 4 }} />
                                    </Tooltip>
                                </span>
                            }
                            name="supportsMCP"
                            valuePropName="checked"
                        >
                            <Switch />
                        </Form.Item>
                    </Form>
                </TabPane>

                <TabPane tab="预设模板" key="templates">
                    <div style={{ marginBottom: '16px' }}>
                        <p style={{ color: '#666', fontSize: '14px' }}>
                            选择一个预设模板快速配置常用模型：
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {presetTemplates.map((template, index) => (
                            <div
                                key={index}
                                style={{
                                    border: '1px solid #d9d9d9',
                                    borderRadius: '6px',
                                    padding: '12px',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s'
                                }}
                                className="hover:border-blue-500 hover:shadow-sm"
                                onClick={() => loadPresetTemplate(template)}
                            >
                                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                                    {template.name}
                                </div>
                                <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                                    {template.description}
                                </div>
                                <div style={{ fontSize: '12px', color: '#999' }}>
                                    Provider: {template.provider} | Model: {template.model}
                                    {template.supportsMCP && ' | 支持MCP工具'}
                                </div>
                            </div>
                        ))}
                    </div>
                </TabPane>
            </Tabs>

            <div style={{ marginTop: '24px', textAlign: 'right' }}>
                <Button onClick={onClose} style={{ marginRight: '8px' }}>
                    取消
                </Button>
                <Button
                    type="primary"
                    loading={loading}
                    onClick={() => form.submit()}
                >
                    {editConfig ? '更新' : '添加'}
                </Button>
            </div>
        </Modal>
    );
};
