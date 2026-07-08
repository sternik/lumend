import type { Channel } from '../../types/channel';

export interface M3uParseResult {
    channels: Channel[];
}

export function parseM3u(content: string): M3uParseResult {
    const lines = content.split(/\r?\n/);
    const channels: Channel[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line.startsWith('#EXTINF:')) continue;

        const infoLine = line;
        const streamLine = lines[i + 1]?.trim();
        if (!streamLine) continue;

        const attributes: Record<string, string> = {};
        const attrMatch = infoLine.match(/([a-zA-Z-]+)="([^"]*)"/g);
        if (attrMatch) {
            attrMatch.forEach((attr) => {
                const [key, value] = attr.split('="');
                if (key && value !== undefined) {
                    attributes[key] = value.replace(/"$/, '');
                }
            });
        }

        const nameMatch = infoLine.match(/,(.*)$/);
        const name = nameMatch ? nameMatch[1].trim() : attributes['tvg-name'] || 'Unknown';

        const channel: Channel = {
            id: attributes['tvg-id'] || attributes['channel-id'] || String(channels.length + 1),
            name,
            number: parseInt(attributes['tvg-chno'] || '0', 10) || channels.length + 1,
            iconUrl: attributes['tvg-logo'] || undefined,
            streamUrl: streamLine,
        };

        channels.push(channel);
    }

    // Sort by channel number
    channels.sort((a, b) => a.number - b.number);

    return { channels };
}
