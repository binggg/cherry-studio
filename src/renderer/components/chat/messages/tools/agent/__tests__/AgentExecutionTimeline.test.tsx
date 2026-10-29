import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'

import type { NormalToolResponse } from '@renderer/types/mcpTool'
import type { CherryMessagePart } from '@shared/data/types/message'

import { buildToolResponseFromPart } from '../../toolResponse'
import { AgentExecutionTimeline } from '../AgentExecutionTimeline'

// Catches running tool cards hiding preliminary output until the command exits.
it('shows successive Bash output while the tool is still running', async () => {
  const part: CherryMessagePart = {
    type: 'dynamic-tool',
    toolCallId: 'child-bash',
    toolName: 'bash',
    state: 'output-available',
    preliminary: true,
    input: { command: 'long-running-command' },
    output: [{ type: 'text', text: 'TOOL-FIRST' }],
    callProviderMetadata: { cherry: { transport: 'pi-agent' } }
  }
  const user = userEvent.setup()
  const { rerender } = render(
    <AgentExecutionTimeline toolResponse={buildToolResponseFromPart(part) as NormalToolResponse} />
  )
  await user.click(screen.getByRole('button', { name: /long-running-command/ }))
  expect(screen.getByText('TOOL-FIRST')).toBeVisible()
  expect(screen.queryByText('TOOL-LAST')).not.toBeInTheDocument()
  rerender(
    <AgentExecutionTimeline
      toolResponse={
        buildToolResponseFromPart({
          ...part,
          output: [{ type: 'text', text: 'TOOL-FIRST\nTOOL-LAST' }]
        }) as NormalToolResponse
      }
    />
  )
  expect(screen.getByText(/TOOL-FIRST\s+TOOL-LAST/)).toBeVisible()
})
