import { flowApi } from './client';

export type FlowNote = {
  id: number;
  content: string;
  noteDate: string;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FlowCalendarDay = {
  date: string;
  notesCount: number;
};

export type FlowNotesListParams = {
  noteDate?: string;
  offset?: number;
  limit?: number;
};

export type CreateFlowNotePayload = {
  content: string;
  noteDate: string;
};

export type UpdateFlowNotePayload = {
  content?: string;
  noteDate?: string;
};

type FlowNoteResponse = {
  id: number;
  content: string;
  note_date: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
};

type FlowNotesListResponse = {
  notes: FlowNoteResponse[];
};

type FlowCalendarDayResponse = {
  date: string;
  notes_count: number;
};

type FlowCalendarParams = {
  month?: number;
  year?: number;
};

function mapFlowNote(note: FlowNoteResponse): FlowNote {
  return {
    id: note.id,
    content: note.content,
    noteDate: note.note_date,
    isCompleted: note.is_completed,
    createdAt: note.created_at,
    updatedAt: note.updated_at,
  };
}

function mapFlowCalendarDay(day: FlowCalendarDayResponse): FlowCalendarDay {
  return {
    date: day.date,
    notesCount: day.notes_count,
  };
}

export async function fetchFlowNotes(params?: FlowNotesListParams): Promise<FlowNote[]> {
  const { data } = await flowApi.get<FlowNotesListResponse>('/notes/', {
    params: {
      ...(params?.noteDate ? { note_date: params.noteDate } : {}),
      ...(typeof params?.offset === 'number' ? { offset: params.offset } : {}),
      ...(typeof params?.limit === 'number' ? { limit: params.limit } : {}),
    },
  });
  return (data.notes ?? []).map(mapFlowNote);
}

export async function fetchFlowCalendar(params?: FlowCalendarParams): Promise<FlowCalendarDay[]> {
  const { data } = await flowApi.get<FlowCalendarDayResponse[]>('/notes/calendar', {
    params: {
      ...(typeof params?.month === 'number' ? { month: params.month } : {}),
      ...(typeof params?.year === 'number' ? { year: params.year } : {}),
    },
  });
  return data.map(mapFlowCalendarDay);
}

export async function fetchFlowNotesByDate(
  noteDate: string,
  params?: Omit<FlowNotesListParams, 'noteDate'>,
): Promise<FlowNote[]> {
  const { data } = await flowApi.get<FlowNotesListResponse>(`/notes/date/${noteDate}`, {
    params: {
      ...(typeof params?.offset === 'number' ? { offset: params.offset } : {}),
      ...(typeof params?.limit === 'number' ? { limit: params.limit } : {}),
    },
  });
  return (data.notes ?? []).map(mapFlowNote);
}

export async function fetchFlowNote(noteId: number): Promise<FlowNote> {
  const { data } = await flowApi.get<FlowNoteResponse>(`/notes/${noteId}`);
  return mapFlowNote(data);
}

export async function createFlowNote(payload: CreateFlowNotePayload): Promise<FlowNote> {
  const { data } = await flowApi.post<FlowNoteResponse>('/notes/', {
    content: payload.content,
    note_date: payload.noteDate,
  });
  return mapFlowNote(data);
}

export async function updateFlowNote(noteId: number, payload: UpdateFlowNotePayload): Promise<FlowNote> {
  const { data } = await flowApi.patch<FlowNoteResponse>(`/notes/${noteId}`, {
    ...(payload.content !== undefined ? { content: payload.content } : {}),
    ...(payload.noteDate !== undefined ? { note_date: payload.noteDate } : {}),
  });
  return mapFlowNote(data);
}

export async function updateFlowNoteStatus(noteId: number, isCompleted: boolean): Promise<FlowNote> {
  const { data } = await flowApi.patch<FlowNoteResponse>(`/notes/${noteId}/status`, {
    is_completed: isCompleted,
  });
  return mapFlowNote(data);
}

export async function deleteFlowNote(noteId: number): Promise<void> {
  await flowApi.delete(`/notes/${noteId}`);
}
