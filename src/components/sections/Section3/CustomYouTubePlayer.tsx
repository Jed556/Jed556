import React, { useState, useEffect, useRef } from 'react';
import YouTube from 'react-youtube';
import type { YouTubeEvent, YouTubePlayer } from 'react-youtube';
import { Play, Pause, Volume2, VolumeX, Loader2, Maximize, Minimize } from 'lucide-react';
import './CustomYouTubePlayer.css';

interface CustomYouTubePlayerProps {
  videoId: string;
}

export const CustomYouTubePlayer: React.FC<CustomYouTubePlayerProps> = ({ videoId }) => {
  const [player, setPlayer] = useState<YouTubePlayer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(1);
  const [isHovered, setIsHovered] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (player && isPlaying) {
      interval = setInterval(() => {
        setProgress(player.getCurrentTime() || 0);
        setDuration(player.getDuration() || 1);
      }, 500);
    }
    return () => clearInterval(interval);
  }, [player, isPlaying]);

  const killCaptions = (target: YouTubePlayer) => {
    try {
      target.unloadModule('captions');
      target.unloadModule('cc');
    } catch (e) {
      // Silently ignore - undocumented API
    }
  };

  const onReady = (event: YouTubeEvent) => {
    setPlayer(event.target);
    setDuration(event.target.getDuration() || 1);
    event.target.setPlaybackQuality('hd1080');
    killCaptions(event.target);
    // Retry after a delay since captions can load asynchronously
    setTimeout(() => killCaptions(event.target), 1000);
    setTimeout(() => killCaptions(event.target), 3000);
    event.target.playVideo();
  };

  const onStateChange = (event: YouTubeEvent) => {
    // 1 = playing, 2 = paused, 3 = buffering, -1 = unstarted
    if (event.data === 1) {
      event.target.setPlaybackQuality('hd1080');
      killCaptions(event.target);
    }
    setIsPlaying(event.data === 1);
    setIsLoading(event.data === 3 || event.data === -1);
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (player) {
      if (isPlaying) {
        player.pauseVideo();
      } else {
        setIsLoading(true);
        player.playVideo();
      }
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (player) {
      if (isMuted) {
        player.unMute();
        setIsMuted(false);
      } else {
        player.mute();
        setIsMuted(true);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (player) {
      player.seekTo(val, true);
      setProgress(val);
    }
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen().catch(err => {
        console.error(`Error attempting to exit fullscreen: ${err.message}`);
      });
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const opts = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      controls: 0,
      rel: 0,
      modestbranding: 1,
      vq: 'hd1080',
      disablekb: 1,
      fs: 0,
      cc_load_policy: 0,
      iv_load_policy: 3,
    },
  };

  return (
    <div 
      ref={containerRef}
      className="custom-yt-container" 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="custom-yt-iframe-wrapper">
        <YouTube 
          videoId={videoId} 
          opts={opts} 
          onReady={onReady} 
          onStateChange={onStateChange}
          className="custom-yt-iframe"
          iframeClassName="custom-yt-iframe-element"
        />
      </div>

      <div className={`custom-yt-overlay ${isFullscreen ? 'fullscreen' : ''}`} onClick={togglePlay}>
        <div className={`custom-yt-center-icon ${(!isHovered || (isPlaying && !isLoading)) ? 'hidden' : ''}`}>
          {isLoading ? (
            <Loader2 size={48} color="white" style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <Play size={48} fill="white" color="white" style={{ marginLeft: '6px' }} />
          )}
        </div>
      </div>

      <div className={`custom-yt-controls-bar ${isHovered || !isPlaying ? 'visible' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="custom-yt-controls-bg" />
        <div className="custom-yt-controls-content">
          <button className="custom-yt-btn" onClick={togglePlay}>
            {isPlaying ? <Pause size={20} fill="white" color="white" /> : <Play size={20} fill="white" color="white" />}
          </button>
          
          <span className="custom-yt-time">{formatTime(progress)}</span>
          
          <input 
            type="range" 
            min={0} 
            max={duration || 1} 
            step={0.1}
            value={progress} 
            onChange={handleSeek}
            onClick={(e) => e.stopPropagation()}
            className="custom-yt-seekbar"
            style={{ '--progress': `${(progress / (duration || 1)) * 100}%` } as React.CSSProperties}
          />
          
          <span className="custom-yt-time">{formatTime(duration)}</span>

          <button className="custom-yt-btn" onClick={toggleMute}>
            {isMuted ? <VolumeX size={20} color="white" /> : <Volume2 size={20} color="white" />}
          </button>

          <button className="custom-yt-btn" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize size={20} color="white" /> : <Maximize size={20} color="white" />}
          </button>
        </div>
      </div>
    </div>
  );
};
