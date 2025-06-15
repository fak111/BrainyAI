import * as React from 'react';
import { CloseCircleOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { Checkbox, Tooltip, Button, Popconfirm, message } from "antd";
import { useContext, useEffect, useRef, useState } from "react";
import { type CMsItem, type M, ModelManagementContext } from "~provider/ModelManagementProvider";
import CloseCircleBlue from "data-base64:~assets/CloseCircle_blue.svg";
import RedC from "data-base64:~assets/red_c.png";
import GreenC from "data-base64:~assets/green_c.png";
import IconPic from "data-base64:~assets/icon_pic.svg";
import IconPdf from "data-base64:~assets/icon_pdf.svg";
import ShowMore from "data-base64:~assets/show_more.svg";
import IconLock from "data-base64:~assets/lock.svg";
import NewTag from "data-base64:~assets/new_tag.svg";
import { Logger } from "~utils/logger";
import lottie from "lottie-web";
import { ConversationContext } from "~provider/sidepanel/ConversationProvider";
import { AddModelConfigForm } from './AddModelConfigForm';
import { modelConfigManager, type ModelConfig } from '~libs/chatbot/ModelConfigManager';
import { useAPIModel } from '~provider/APIModelProvider';

const LockAnimation = () => {
    const lockRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const animationRef = lottie.loadAnimation({
            container: lockRef!.current!, // the dom element that will contain the animation
            renderer: 'svg',
            loop: true,
            autoplay: true,
            path: chrome.runtime.getURL("/resources/open_lock.json"),
        });
        return () => {
            animationRef.destroy();
        };
    }, []);

    return <div className='w-5 h-5' ref={lockRef}></div>;
};

// API模型项组件
const APIModelItem = ({
    config,
    isSelected,
    onToggle,
    onEdit,
    onDelete
}: {
    config: ModelConfig;
    isSelected: boolean;
    onToggle: (config: ModelConfig, selected: boolean) => void;
    onEdit: (config: ModelConfig) => void;
    onDelete: (config: ModelConfig) => void;
}) => {
    const formatTokenLimit = (val: number) => {
        return Math.round(val / 1000);
    };

    const modelTip = (config: ModelConfig) => {
        return <div className='px-1 py-[6px] text-[14px]'>
            <div className="font-bold mb-1">{config.name}</div>
            <div className="mb-2 text-white text-opacity-60">
                API模式 - {config.provider}
            </div>
            <div className='text-[12px] text-white text-opacity-60'>
                {config.description || `${config.model} - 支持工具调用`}
            </div>
        </div>;
    };

    return (
        <div className={`relative w-full h-9 px-4 box-border hover:bg-[#F2F5FF] flex justify-between items-center group`}>
            <div className='flex items-center justify-start'>
                <Checkbox
                    checked={isSelected}
                    className={'w-4 h-4 mr-4'}
                    onChange={(e) => onToggle(config, e.target.checked)}
                />
                <Tooltip overlayStyle={{ maxWidth: '300px' }} title={modelTip(config)} placement={"topLeft"}>
                    <div className='flex items-center'>
                        <div className='w-4 h-4 mr-2 relative'>
                            <img className={'w-full h-full'} src={config.logoSrc} alt="" />
                        </div>
                        <span className='mr-1 text-[14px]'>{config.name}</span>
                    </div>
                </Tooltip>
                <Tooltip title={'API模式 - 支持工具调用'}>
                    <div className="h-5 box-border px-2 py-1 rounded bg-[#52C41A] bg-opacity-20 text-[10px] text-[#52C41A] font-bold ml-2">
                        API
                    </div>
                </Tooltip>
                {config.supportsMCP && (
                    <Tooltip title={'支持MCP工具调用'}>
                        <div className="h-5 box-border px-2 py-1 rounded bg-[#1890FF] bg-opacity-20 text-[10px] text-[#1890FF] font-bold ml-1">
                            🔧 MCP
                        </div>
                    </Tooltip>
                )}
            </div>
            <div className="flex justify-end items-center">
                {config.maxTokens && (
                    <Tooltip title={`支持最多 ${config.maxTokens} tokens`}>
                        <div className="flex justify-center items-center ml-1 h-5 rounded bg-[#4948DB1A] bg-opacity-10 text-[12px] text-[#4948DB] font-medium px-1 leading-none">
                            {formatTokenLimit(config.maxTokens)}k
                        </div>
                    </Tooltip>
                )}
                <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => onEdit(config)}
                        className="text-blue-500 hover:text-blue-700"
                    />
                    <Popconfirm
                        title="确认删除"
                        description="确定要删除这个API模型配置吗？"
                        onConfirm={() => onDelete(config)}
                        okText="删除"
                        cancelText="取消"
                    >
                        <Button
                            type="text"
                            size="small"
                            icon={<DeleteOutlined />}
                            className="text-red-500 hover:text-red-700"
                        />
                    </Popconfirm>
                </div>
            </div>
        </div>
    );
};

// API模型分组组件
const APIModelSection = ({
    configs,
    selectedConfigs,
    onToggle,
    onEdit,
    onDelete,
    onAdd
}: {
    configs: ModelConfig[];
    selectedConfigs: ModelConfig[];
    onToggle: (config: ModelConfig, selected: boolean) => void;
    onEdit: (config: ModelConfig) => void;
    onDelete: (config: ModelConfig) => void;
    onAdd: () => void;
}) => {
    const [isShowMore, setIsShowMore] = useState(false);
    const displayConfigs = isShowMore ? configs : configs.slice(0, 3);

    return (
        <div className="text-[#333333] mb-3">
            <div className="px-4 py-2 flex justify-between items-center">
                <div className="flex items-center">
                    <img src={GreenC} className='w-4 h-4 mr-2' alt="" />
                    <span className='text-[14px] text-[#C2C2C2] leading-none'>API Models</span>
                </div>
                <Button
                    type="text"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={onAdd}
                    className="text-blue-500 hover:text-blue-700"
                >
                    添加
                </Button>
            </div>

            {displayConfigs.map((config) => (
                <APIModelItem
                    key={config.id}
                    config={config}
                    isSelected={selectedConfigs.some(c => c.id === config.id)}
                    onToggle={onToggle}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            ))}

            {configs.length > 3 && !isShowMore && (
                <div className='w-full flex justify-center items-center my-2 cursor-pointer' onClick={() => setIsShowMore(true)}>
                    <img src={ShowMore} className='w-4 h-4 mr-1' alt="" />
                    <span className='text-[12px] text-[#C2C2C2] mr-1'>{configs.length - 3} models remaining</span>
                    <img src={ShowMore} className='w-4 h-4' alt="" />
                </div>
            )}
        </div>
    );
};

const ModelItems = ({ item }: { item: CMsItem }) => {
    const [isShowMore, setIsShowMore] = useState(false);
    const [isLogin, setIsLogin] = useState(false);
    const [isOpenProviderToolTip, setIsOpenProviderToolTip] = useState(false);
    const { conversationId } = useContext(ConversationContext);
    const labelTipRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        getLoginStatus();
        window.addEventListener('mousedown', (e: MouseEvent) => {
            if (labelTipRef.current && !labelTipRef.current.contains(e.target as Node)) {
                setIsOpenProviderToolTip(false);
            }
        });
    }, []);

    const getLoginStatus = async () => {
        const [, isLogin] = await item.models[0].checkIsLogin();
        Logger.log('login:', item.models[0].botName, isLogin);
        setIsLogin(isLogin);
    };

    const showMore = (val: boolean) => {
        setIsShowMore(val);
    };

    const openLogin = async function (model: M) {
        const r = await new model({ globalConversationId: conversationId }).startAuth();

        if (r) {
            getLoginStatus();
        }
    };

    const labelTip = (item: CMsItem) => {
        return <div ref={labelTipRef} className='px-1 py-[6px] text-[14px] text-white text-opacity-60 flex justify-start items-center'>
            <LockAnimation />
            <div className='ml-1'>Log into&nbsp;</ div>
            <u className='text-white cursor-pointer' onClick={() => { openLogin(item.models[0]); }}>{new URL(item.models[0].loginUrl).hostname}</u>
            &nbsp;to use
        </div>;
    };

    return <div className="text-[#333333] mb-3">
        <div className="px-4 py-2 flex justify-start items-center">
            <img src={isLogin ? GreenC : RedC} className='w-4 h-4 mr-2' alt="" />
            <Tooltip title={labelTip(item)} overlayStyle={{ maxWidth: '350px' }} placement={"topLeft"} open={isOpenProviderToolTip}>
                <span className='text-[14px] text-[#C2C2C2] leading-none'>{item.label}</span>
            </Tooltip>
        </div>

        {
            item.models.slice(0, isShowMore && item.models.length > 3 ? item.models.length : 3).map((model) => {
                return (
                    <ModelItem key={model.botName} model={model} isLogin={isLogin} setIsOpenProviderToolTip={setIsOpenProviderToolTip} getLoginStatus={getLoginStatus}></ModelItem>
                );
            })
        }
        {
            item.models.length > 3 && !isShowMore &&
            <div className='w-full flex justify-center items-center my-2 cursor-pointer' onClick={() => showMore(true)}>
                <img src={ShowMore} className='w-4 h-4 mr-1' alt="" />
                <span className='text-[12px] text-[#C2C2C2] mr-1'>{item.models.length - 3} models remaining</span>
                <img src={ShowMore} className='w-4 h-4' alt="" />
            </div>
        }
    </div>;
};

const ModelItem = ({ model, isLogin, setIsOpenProviderToolTip, getLoginStatus }: { model: M, isLogin: boolean, setIsOpenProviderToolTip: React.Dispatch<React.SetStateAction<boolean>>, getLoginStatus: () => void }) => {
    const [modelCanUse, setModelCanUse] = useState(false);
    const { conversationId } = useContext(ConversationContext);
    const { currentBots, setCurrentBots, saveCurrentBotsKeyLocal } = useContext(ModelManagementContext);

    useEffect(() => {
        getUseStatus();
    }, [isLogin]);

    const getUseStatus = async () => {
        const val = await model.checkModelCanUse();
        Logger.log('canUse:', model.botName, val);
        setModelCanUse(val);
    };

    const openLogin = async function (model: M) {
        const r = await new model({ globalConversationId: conversationId }).startAuth();

        if (r) {
            getUseStatus();
            getLoginStatus();
        }
    };

    const modelChange: (e, model) => void = async (e, model) => {
        if (!e.target.checked && currentBots.length > 1) {
            setCurrentBots(currentBots.filter(item => item.botName !== model.botName));
        }

        if (e.target.checked) {
            if (currentBots.length >= 3) {
                setCurrentBots([...currentBots.slice(1), model]);
            } else {
                setCurrentBots([...currentBots, model]);
            }

            if (model.requireLogin && !isLogin) {
                setIsOpenProviderToolTip(true);
            }
        }

        saveCurrentBotsKeyLocal();
    };

    const formatTokenLimit = (val: number) => {
        return Math.round(val / 1000);
    };

    const modelTip = (model: M) => {
        return <div className='px-1 py-[6px] text-[14px]'>
            <div className="font-bold mb-1">{model.botName}</div>
            <div className="mb-2 text-white text-opacity-60">
                {modelCanUse ? 'Provided by ' : 'Log into '}
                <u className='text-white cursor-pointer' onClick={() => { openLogin(model); }}>{new URL(model.loginUrl).hostname}</u>
                {modelCanUse ? '' : ' and confirm you can access this model'}
            </div>
            <div className='text-[12px] text-white text-opacity-60'>{model.desc}</div>
        </div>;
    };

    // ${currentBots.includes(model) && 'bg-gradient-to-r from-[#E5ECFF]'}
    return (
        <div className={`relative w-full h-9 px-4 box-border  hover:bg-[#F2F5FF] flex justify-between items-center`}>
            <div className='flex items-center justify-start'>
                {/*{currentBots.includes(model) && <div className="w-1 h-full bg-[#0A4DFE] absolute left-0 top-0"/>}*/}
                <Checkbox checked={currentBots.includes(model)} className={'w-4 h-4 mr-4'} onChange={(event) => modelChange(event, model)} />
                <Tooltip overlayStyle={{ maxWidth: '300px' }} title={modelTip(model)} placement={"topLeft"}>
                    <div className='flex items-center'>
                        <div className='w-4 h-4 mr-2 relative'>
                            <img className={'w-full h-full'} src={model.logoSrc} alt="" />
                            {!modelCanUse &&
                                <img src={IconLock} className='w-4 h-4 absolute right-[-8px] bottom-[-6px]' alt="" />}
                        </div>
                        <span className='mr-1 text-[14px]'>{model.botName}</span>
                    </div>
                </Tooltip>
                {
                    model.paidModel &&
                    <Tooltip title={'This model needs to be paid at the provider\'s website.'}>
                        <div
                            className="h-5 box-border px-2 py-1 rounded bg-[#C2C2C2] bg-opacity-20 text-[10px] text-[#C2C2C2] font-bold">3rd-paid
                        </div>
                    </Tooltip>
                }
            </div>
            <div className="flex justify-end items-center">
                {
                    model.supportUploadPDF &&
                    <Tooltip title={'This model can analyze PDF document.'}><img className='ml-1 w-5 h-5' src={IconPdf} alt="" /></Tooltip>
                }
                {
                    model.supportUploadImage &&
                    <Tooltip title={'This model can analyze image.'}><img className='ml-1 w-5 h-5' src={IconPic} alt="" /></Tooltip>
                }
                {
                    model.maxTokenLimit &&
                    <Tooltip title={'This model supports up to 128.000 tokens in a single session'}>
                        <div className="flex justify-center items-center ml-1 h-5 rounded bg-[#4948DB1A] bg-opacity-10 text-[12px] text-[#4948DB] font-medium px-1 leading-none">{formatTokenLimit(model.maxTokenLimit)}k</div>
                    </Tooltip>
                }
            </div>
            {
                model.newModel && <img src={NewTag} className='w-6 h-6 absolute right-0 top-0' alt="" />
            }
        </div>
    );
};

interface Props {
    onClose: () => void;
}

export const ModelCheckList = ({ onClose }: Props) => {
    const { currentBots, setCurrentBots, saveCurrentBotsKeyLocal, categoryModels } = useContext(ModelManagementContext);
    const {
        apiConfigs,
        selectedConfigs: selectedApiConfigs,
        loadConfigs: loadApiConfigs,
        selectConfig,
        unselectConfig,
        isConfigSelected
    } = useAPIModel();
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingConfig, setEditingConfig] = useState<ModelConfig | null>(null);

    useEffect(() => {
        Logger.log('ModelCheckList initialized');
    }, []);

    const modelUnCheck = (model: M) => {
        if (currentBots.length > 1) {
            setCurrentBots(currentBots.filter(item => item.botName !== model.botName));
        }
        saveCurrentBotsKeyLocal();
    };

    const handleApiModelToggle = (config: ModelConfig, selected: boolean) => {
        if (selected) {
            selectConfig(config);
        } else {
            unselectConfig(config);
        }
    };

    const handleEditConfig = (config: ModelConfig) => {
        setEditingConfig(config);
        setShowAddForm(true);
    };

    const handleDeleteConfig = async (config: ModelConfig) => {
        try {
            await modelConfigManager.deleteConfig(config.id);
            message.success('模型配置删除成功');

            // 从选中列表中移除
            unselectConfig(config);

            // 重新加载配置列表
            await loadApiConfigs();
        } catch (error) {
            Logger.error('Failed to delete config:', error);
            message.error('删除失败');
        }
    };

    const handleAddSuccess = async (config: ModelConfig) => {
        await loadApiConfigs();
        message.success(editingConfig ? '模型配置更新成功' : '模型配置添加成功');
    };

    const handleCloseForm = () => {
        setShowAddForm(false);
        setEditingConfig(null);
    };

    return (
        <div>
            <div className="flex justify-between items-center h-[64px] sticky top-0 z-10 px-4 bg-white">
                <span className='text-[20px] text-[#333333] font-bold'>AI Models</span>
                <CloseCircleOutlined onClick={onClose} style={{ fontSize: '24px', color: '#5E5E5E' }} />
            </div>
            <div className='border-t border-[#F3F4F9] p-4 sticky top-[64px] z-10 bg-white'>
                <div className='pr-2 pt-2 bg-[#F3F4F9] rounded-2xl flex justify-start flex-wrap'>
                    {
                        currentBots.map((item, index) => {
                            return <div key={index}
                                className="relative group hover:shadow-[0_0_6px_0px_rgba(0,0,0,0.2)] rounded-[12.5px] bg-white px-2 py-[4.5px] flex items-center justify-start mb-2 ml-2 flex-1 max-w-[48%]">
                                {/*<div*/}
                                {/*    className="bg-[#C2C2C233] bg-opacity-20 text-[#C2C2C2] text-[10px] w-4 h-4 rounded-full mr-2 flex justify-center items-center">{index + 1}</div>*/}
                                <img className='mr-2 w-4 h-4' src={item.logoSrc} alt='' />
                                <div className="text-[12px] text-[#333333] mr-3 truncate">{item.botName}</div>
                                {
                                    currentBots.length > 1 &&
                                    <div className='h-4 absolute right-[-4px] top-[-8px]'>
                                        <img onClick={() => {
                                            modelUnCheck(item);
                                        }} className='w-4 h-4 group-hover:block hidden' src={CloseCircleBlue} alt="" />
                                    </div>
                                }
                            </div>;
                        })
                    }
                    {/* 显示选中的API模型 */}
                    {
                        selectedApiConfigs.map((config, index) => {
                            return <div key={`api-${config.id}`}
                                className="relative group hover:shadow-[0_0_6px_0px_rgba(0,0,0,0.2)] rounded-[12.5px] bg-white px-2 py-[4.5px] flex items-center justify-start mb-2 ml-2 flex-1 max-w-[48%]">
                                <img className='mr-2 w-4 h-4' src={config.logoSrc} alt='' />
                                <div className="text-[12px] text-[#333333] mr-3 truncate">{config.name}</div>
                                <div className="text-[8px] text-[#52C41A] bg-[#52C41A] bg-opacity-20 px-1 rounded mr-2">API</div>
                                {
                                    selectedApiConfigs.length > 1 &&
                                    <div className='h-4 absolute right-[-4px] top-[-8px]'>
                                        <img onClick={() => {
                                            handleApiModelToggle(config, false);
                                        }} className='w-4 h-4 group-hover:block hidden' src={CloseCircleBlue} alt="" />
                                    </div>
                                }
                            </div>;
                        })
                    }
                </div>
            </div>

            {/* API模型分组 */}
            {apiConfigs.length > 0 && (
                <APIModelSection
                    configs={apiConfigs}
                    selectedConfigs={selectedApiConfigs}
                    onToggle={handleApiModelToggle}
                    onEdit={handleEditConfig}
                    onDelete={handleDeleteConfig}
                    onAdd={() => setShowAddForm(true)}
                />
            )}

            {/* 如果没有API模型，显示添加按钮 */}
            {apiConfigs.length === 0 && (
                <div className="text-[#333333] mb-3">
                    <div className="px-4 py-2 flex justify-between items-center">
                        <div className="flex items-center">
                            <img src={GreenC} className='w-4 h-4 mr-2' alt="" />
                            <span className='text-[14px] text-[#C2C2C2] leading-none'>API Models</span>
                        </div>
                        <Button
                            type="text"
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={() => setShowAddForm(true)}
                            className="text-blue-500 hover:text-blue-700"
                        >
                            添加
                        </Button>
                    </div>
                    <div className="px-4 py-8 text-center text-gray-500">
                        <div className="mb-2">还没有配置API模型</div>
                        <div className="text-sm">点击"添加"按钮配置您的第一个API模型</div>
                    </div>
                </div>
            )}

            {/* 原有的Web模型分组 */}
            {
                categoryModels.current.map((item, i) => {
                    return (
                        <ModelItems key={i} item={item} />
                    );
                })
            }

            {/* 添加/编辑模型配置表单 */}
            <AddModelConfigForm
                visible={showAddForm}
                onClose={handleCloseForm}
                onSuccess={handleAddSuccess}
                editConfig={editingConfig}
            />
        </div>
    );
};
