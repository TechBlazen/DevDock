import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from '../../store';
import type { ChatMessage } from '../../types';

const userMsg: ChatMessage = {
  id: 'm-1',
  role: 'user',
  content: 'Hello',
  timestamp: new Date(),
};

const assistantMsg: ChatMessage = {
  id: 'm-2',
  role: 'assistant',
  content: 'Hi there',
  timestamp: new Date(),
  provider: 'anthropic',
  traceId: 'trace-abc',
};

describe('useChatStore', () => {
  beforeEach(() => {
    // Reset messages, isLoading, chat mode
    useChatStore.setState({
      messages: useChatStore.getInitialState().messages,
      isLoading: false,
      isOpen: false,
      chatMode: 'devdock',
      overwatchToolCalls: [],
      overwatchThinking: false,
    });
  });

  it('starts with a devdock welcome message', () => {
    const { messages, chatMode } = useChatStore.getState();
    expect(messages.length).toBe(1);
    expect(messages[0].role).toBe('assistant');
    expect(chatMode).toBe('devdock');
  });

  it('adds a user message to the log', () => {
    const before = useChatStore.getState().messages.length;
    useChatStore.getState().addMessage(userMsg);
    expect(useChatStore.getState().messages.length).toBe(before + 1);
    expect(useChatStore.getState().messages[useChatStore.getState().messages.length - 1]?.role).toBe('user');
  });

  it('adds an assistant message preserving provider and traceId', () => {
    useChatStore.getState().addMessage(assistantMsg);
    const last = useChatStore.getState().messages[useChatStore.getState().messages.length - 1];
    expect(last?.provider).toBe('anthropic');
    expect(last?.traceId).toBe('trace-abc');
  });

  it('clearMessages resets to just the welcome message for the current mode', () => {
    useChatStore.getState().addMessage(userMsg);
    useChatStore.getState().addMessage(assistantMsg);
    useChatStore.getState().clearMessages();
    const msgs = useChatStore.getState().messages;
    expect(msgs.length).toBe(1);
    expect(msgs[0].role).toBe('assistant');
    expect(msgs[0].id).toContain('welcome-devdock');
  });

  it('setLoading toggles the loading flag', () => {
    useChatStore.getState().setLoading(true);
    expect(useChatStore.getState().isLoading).toBe(true);
    useChatStore.getState().setLoading(false);
    expect(useChatStore.getState().isLoading).toBe(false);
  });

  it('setOpen toggles the panel open flag', () => {
    useChatStore.getState().setOpen(true);
    expect(useChatStore.getState().isOpen).toBe(true);
  });

  it('setChatMode swaps welcome message and clears overwatch state', () => {
    useChatStore.getState().setChatMode('overwatch');
    const state = useChatStore.getState();
    expect(state.chatMode).toBe('overwatch');
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0].id).toContain('welcome-overwatch');
    expect(state.overwatchToolCalls).toEqual([]);
    expect(state.overwatchThinking).toBe(false);
  });
});
