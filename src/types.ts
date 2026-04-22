export type SessionEvent =
  | {
      type: "user_message";
      text: string;
      timestamp?: string;
    }
  | {
      type: "assistant_text";
      text: string;
      timestamp?: string;
    }
  | {
      type: "assistant_code";
      code: string;
      language?: string;
      timestamp?: string;
    }
  | {
      type: "tool_summary";
      tool: string;
      args?: string;
      result?: string;
      timestamp?: string;
    }
  | {
      type: "commentary";
      text: string;
      timestamp?: string;
    };

export type UserBlock = {
  type: "user";
  text: string;
};

export type AssistantBlock =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "code";
      code: string;
      language?: string;
    }
  | {
      type: "tool_summary";
      tool: string;
      args?: string;
      result?: string;
    };

export type ShareRound = {
  user: UserBlock;
  assistant: AssistantBlock[];
};

export type SharePayload = {
  sessionId: string;
  createdAt: string;
  roundCount: number;
  rounds: ShareRound[];
};
