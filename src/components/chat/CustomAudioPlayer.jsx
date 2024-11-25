import React, { useRef, useState, useEffect } from "react";

const CompactAudioPlayer = ({ src }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
    };

    const handleDurationChange = () => setDuration(audio.duration);

    const handleAudioEnd = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
      audio.currentTime = 0; // Reinicia el audio al principio
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleDurationChange);
    audio.addEventListener("ended", handleAudioEnd); // Evento para el final del audio

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleDurationChange);
      audio.removeEventListener("ended", handleAudioEnd);
    };
  }, []);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleProgressChange = (e) => {
    const audio = audioRef.current;
    const newProgress = e.target.value;
    setProgress(newProgress);
    audio.currentTime = (newProgress / 100) * audio.duration;
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  return (
    <div className="flex flex-col items-center p-2 bg-gray-100 rounded-lg w-full max-w-xs">
      <div className="flex items-center gap-2 w-full">
        {/* Botón de reproducción/pausa */}
        <button
          onClick={togglePlayPause}
          className="text-xl text-green-500 focus:outline-none"
        >
          {isPlaying ? (
            <i className="bx bx-pause"></i>
          ) : (
            <i className="bx bx-play"></i>
          )}
        </button>

        {/* Barra de progreso */}
        <input
          type="range"
          value={progress}
          onChange={handleProgressChange}
          className="flex-grow appearance-none h-1 bg-gray-300 rounded-full accent-green-500"
        />
      </div>

      {/* Tiempos actuales */}
      <div className="flex justify-between w-full text-xs text-gray-600 mt-1">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Elemento de audio oculto */}
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
    </div>
  );
};

export default CompactAudioPlayer;
