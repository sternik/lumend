export interface TvheadendServerInfo {
    sw_version: string;
    api_version: number;
    name: string;
    capabilities: string[];
}

export interface TvheadendProfile {
    key: string;
    val: string;
}

export interface TvheadendProfileList {
    entries: TvheadendProfile[];
}

export interface TvheadendEpgEvent {
    eventId: number;
    channelUuid: string;
    channelNumber?: number;
    channelName?: string;
    start: number;
    stop: number;
    title: string;
    subtitle?: string;
    description?: string;
    summary?: string;
}

export interface TvheadendEpgGrid {
    entries: TvheadendEpgEvent[];
    totalCount: number;
}

export interface TvheadendConnectionStatus {
    serverInfo: { success: boolean; message: string; name?: string; version?: string };
    playlist: { success: boolean; message: string; channelCount?: number };
    stream: { success: boolean; message: string };
}
