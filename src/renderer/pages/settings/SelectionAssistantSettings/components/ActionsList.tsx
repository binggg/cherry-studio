import type { DroppableProvided } from '@hello-pangea/dnd'
import { Draggable, Droppable } from '@hello-pangea/dnd'
import { memo } from 'react'

import type { SelectionAction } from '@shared/types/selection'

import type { SelectionActionAgentInfo } from '../hooks/useSettingsActionsList'
import ActionsListItemComponent from './ActionsListItem'

interface ActionListProps {
  droppableId: 'enabled' | 'disabled'
  items: SelectionAction[]
  isLastEnabledItem: boolean
  onEdit: (item: SelectionAction) => void
  onDelete: (id: string) => void
  getSearchEngineInfo: (engine: string) => { icon: any; name: string } | null
  getAgentInfo: (item: SelectionAction) => SelectionActionAgentInfo | null
}

const ActionsList = memo(
  ({ droppableId, items, isLastEnabledItem, onEdit, onDelete, getSearchEngineInfo, getAgentInfo }: ActionListProps) => {
    return (
      <Droppable droppableId={droppableId}>
        {(provided: DroppableProvided) => (
          <div ref={provided.innerRef} className="mb-4 rounded pb-px" {...provided.droppableProps}>
            <div>
              {items.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(provided) => (
                    <ActionsListItemComponent
                      item={item}
                      provided={provided}
                      listType={droppableId}
                      isLastEnabledItem={isLastEnabledItem}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      getSearchEngineInfo={getSearchEngineInfo}
                      getAgentInfo={getAgentInfo}
                    />
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          </div>
        )}
      </Droppable>
    )
  }
)

export default ActionsList
