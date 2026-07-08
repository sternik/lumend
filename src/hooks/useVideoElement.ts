import { useRef } from 'react';

export const useVideoElement = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioTracksRef = useRef<AudioTrackList | undefined>(undefined);
    const textTracksRef = useRef<TextTrackList | undefined>(undefined);

    const getMediaElement = () => videoRef.current;

    const setAudioTracks = (tracks: AudioTrackList | undefined) => {
        audioTracksRef.current = tracks;
    };

    const setTextTracks = (tracks: TextTrackList | undefined) => {
        textTracksRef.current = tracks;
    };

    const resetPlayer = (videoElement: HTMLVideoElement) => {
        setAudioTracks(undefined);
        setTextTracks(undefined);

        while (videoElement.firstChild) {
            videoElement.removeChild(videoElement.firstChild);
        }

        videoElement.load();
    };

    const changeSource = (dataUrl: URL, label?: string) => {
        const videoElement = getMediaElement();
        if (!videoElement) return;

        resetPlayer(videoElement);

        const source = document.createElement('source');
        source.setAttribute('src', dataUrl.toString());
        videoElement.appendChild(source);

        const playPromise = videoElement.play();
        if (playPromise !== undefined) {
            playPromise
                .then()
                .catch((error) => console.log(`${label || 'video'} switched before it could be played`, error));
        }
    };

    const getWidth = () => window.innerWidth;
    const getHeight = () => window.innerHeight;

    return {
        videoRef,
        audioTracksRef,
        textTracksRef,
        getMediaElement,
        resetPlayer,
        changeSource,
        setAudioTracks,
        setTextTracks,
        getWidth,
        getHeight,
    };
};
