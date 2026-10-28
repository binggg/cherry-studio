import type { DropResult } from '@hello-pangea/dnd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { loggerService } from '@logger'
import { useAgents } from '@renderer/hooks/agent/useAgent'
import { popup } from '@renderer/services/popup'
import { getAgentAvatarFromConfiguration } from '@renderer/utils/agent'
import { BUILTIN_AGENT_ROLE } from '@shared/ai/builtinAgent'
import { DefaultPreferences } from '@shared/data/preference/preferenceSchemas'
import { SELECTION_ACTION_RUNNER, type SelectionActionItem } from '@shared/data/preference/preferenceTypes'
import {
  type AskAgentSelectionAction,
  type CustomSelectionAction,
  SELECTION_BUILTIN_ACTION_ID,
  type SelectionAction
} from '@shared/types/selection'

import { DEFAULT_SEARCH_ENGINES } from '../components/SelectionActionSearchModal'

const logger = loggerService.withContext('useSettingsActionsList')

const MAX_CUSTOM_ITEMS = 10
const MAX_ENABLED_ITEMS = 8

export const useActionItems = (
  initialItems: SelectionAction[] | undefined,
  setActionItems: (items: SelectionActionItem[]) => void
) => {
  const { t } = useTranslation()
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [isAskAgentModalOpen, setIsAskAgentModalOpen] = useState(false)
  const [userEditingAction, setUserEditingAction] = useState<CustomSelectionAction | null>(null)
  const { agents } = useAgents()

  const enabledItems = useMemo(() => initialItems?.filter((item) => item.enabled) ?? [], [initialItems])
  const disabledItems = useMemo(() => initialItems?.filter((item) => !item.enabled) ?? [], [initialItems])
  const customItemsCount = useMemo(() => initialItems?.filter((item) => !item.isBuiltIn).length ?? 0, [initialItems])

  const handleEditActionItem = (item: SelectionAction) => {
    if (item.isBuiltIn) {
      if (item.id === SELECTION_BUILTIN_ACTION_ID.SEARCH) {
        setIsSearchModalOpen(true)
        return
      }
      if (item.id === SELECTION_BUILTIN_ACTION_ID.ASK_AGENT) {
        setIsAskAgentModalOpen(true)
        return
      }
      return
    }
    setUserEditingAction(item)
    setIsUserModalOpen(true)
  }

  const handleAddNewAction = () => {
    if (customItemsCount >= MAX_CUSTOM_ITEMS) return
    setUserEditingAction(null)
    setIsUserModalOpen(true)
  }

  const handleUserModalOk = (actionItem: CustomSelectionAction) => {
    if (userEditingAction && initialItems) {
      const updatedItems = initialItems.map((item) => (item.id === userEditingAction.id ? actionItem : item))
      setActionItems(updatedItems)
    } else {
      try {
        const currentItems = initialItems || []
        setActionItems([...currentItems, actionItem])
      } catch (error) {
        logger.debug('Error adding item:', error as Error)
      }
    }
    setIsUserModalOpen(false)
  }

  const handleSearchModalOk = (searchEngine: string) => {
    if (!initialItems) return
    const updatedItems = initialItems.map((item) =>
      item.isBuiltIn && item.id === SELECTION_BUILTIN_ACTION_ID.SEARCH ? { ...item, searchEngine } : item
    )
    setActionItems(updatedItems)
    setIsSearchModalOpen(false)
  }

  const handleAskAgentModalOk = (binding: Pick<AskAgentSelectionAction, 'agentId' | 'agentWorkspace'>) => {
    if (!initialItems) return
    setActionItems(
      initialItems.map((item) =>
        item.isBuiltIn && item.id === SELECTION_BUILTIN_ACTION_ID.ASK_AGENT ? { ...item, ...binding } : item
      )
    )
    setIsAskAgentModalOpen(false)
  }

  const handleDeleteActionItem = async (id: string) => {
    if (!initialItems) return
    const confirmed = await popup.confirm({
      centered: true,
      content: t('selection.settings.actions.delete_confirm')
    })
    if (!confirmed) return

    setActionItems(initialItems.filter((item) => item.id !== id))
  }

  const handleReset = async () => {
    if (!initialItems) return
    const confirmed = await popup.confirm({
      centered: true,
      content: t('selection.settings.actions.reset.confirm')
    })
    if (!confirmed) return

    const userItems = initialItems.filter((item) => !item.isBuiltIn).map((item) => ({ ...item, enabled: false }))
    setActionItems([...DefaultPreferences.default['feature.selection.action_items'], ...userItems])
  }

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || !initialItems) return

    const { source, destination } = result

    if (source.droppableId === 'enabled' && destination.droppableId === 'disabled' && enabledItems.length === 1) {
      return
    }

    if (source.droppableId === destination.droppableId) {
      const list = source.droppableId === 'enabled' ? [...enabledItems] : [...disabledItems]
      const [removed] = list.splice(source.index, 1)
      list.splice(destination.index, 0, removed)

      if (source.droppableId === 'enabled') {
        const limitedEnabledItems = list.slice(0, MAX_ENABLED_ITEMS)
        const overflowItems = list.length > MAX_ENABLED_ITEMS ? list.slice(MAX_ENABLED_ITEMS) : []

        const updatedItems = [
          ...limitedEnabledItems.map((item) => ({ ...item, enabled: true })),
          ...disabledItems,
          ...overflowItems.map((item) => ({ ...item, enabled: false }))
        ]

        setActionItems(updatedItems)
      } else {
        const updatedItems = [...enabledItems, ...list]
        setActionItems(updatedItems)
      }
      return
    }

    const sourceList = source.droppableId === 'enabled' ? [...enabledItems] : [...disabledItems]
    const destList = destination.droppableId === 'enabled' ? [...enabledItems] : [...disabledItems]

    const [removed] = sourceList.splice(source.index, 1)
    const updatedItem = { ...removed, enabled: destination.droppableId === 'enabled' }

    const filteredDestList = destList.filter((item) => item.id !== updatedItem.id)
    filteredDestList.splice(destination.index, 0, updatedItem)

    let newEnabledItems = destination.droppableId === 'enabled' ? filteredDestList : sourceList
    let newDisabledItems = destination.droppableId === 'disabled' ? filteredDestList : sourceList

    if (newEnabledItems.length > MAX_ENABLED_ITEMS) {
      const overflowItems = newEnabledItems.slice(MAX_ENABLED_ITEMS).map((item) => ({ ...item, enabled: false }))
      newEnabledItems = newEnabledItems.slice(0, MAX_ENABLED_ITEMS)
      newDisabledItems = [...newDisabledItems, ...overflowItems]
    }

    const updatedItems = [
      ...newEnabledItems.map((item) => ({ ...item, enabled: true })),
      ...newDisabledItems.map((item) => ({ ...item, enabled: false }))
    ]

    setActionItems(updatedItems)
  }

  const getSearchEngineInfo = (searchEngine: string) => {
    if (!searchEngine) return null
    const [engine] = searchEngine.split('|')
    const defaultEngine = DEFAULT_SEARCH_ENGINES.find((e) => e.value === engine)
    if (defaultEngine) {
      return { icon: defaultEngine.icon, name: defaultEngine.label }
    }
    const customEngine = DEFAULT_SEARCH_ENGINES.find((e) => e.value === 'custom')
    return { icon: customEngine?.icon, name: engine }
  }

  const builtinAssistantAgentId = agents.find(
    (candidate) => candidate.configuration?.builtin_role === BUILTIN_AGENT_ROLE.ASSISTANT
  )?.id

  const getAgentInfo = (item: SelectionAction) => {
    const agentId = item.isBuiltIn
      ? item.id === SELECTION_BUILTIN_ACTION_ID.ASK_AGENT
        ? (item.agentId ?? builtinAssistantAgentId)
        : undefined
      : item.runner === SELECTION_ACTION_RUNNER.AGENT
        ? item.agentId
        : undefined
    const agent = agentId ? agents.find((candidate) => candidate.id === agentId) : undefined
    if (!agent) return null
    return { emoji: getAgentAvatarFromConfiguration(agent.configuration), name: agent.name }
  }

  return {
    enabledItems,
    disabledItems,
    customItemsCount,
    isUserModalOpen,
    isSearchModalOpen,
    isAskAgentModalOpen,
    userEditingAction,
    setIsUserModalOpen,
    setIsSearchModalOpen,
    setIsAskAgentModalOpen,
    setUserEditingAction,
    handleEditActionItem,
    handleAddNewAction,
    handleUserModalOk,
    handleSearchModalOk,
    handleAskAgentModalOk,
    handleDeleteActionItem,
    handleReset,
    onDragEnd,
    getSearchEngineInfo,
    getAgentInfo,
    MAX_CUSTOM_ITEMS,
    MAX_ENABLED_ITEMS
  }
}
