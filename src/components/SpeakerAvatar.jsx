import React from "react";

export default function SpeakerAvatar({ imageUrl, loading, fallback }) {
  return (
    <div className="w-8 h-8 rounded-full border bd-brown overflow-hidden shrink-0 flex items-center justify-center bg-ink-60 tx-gold-mid">
      {imageUrl ? (
        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
      ) : loading ? (
        <div className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : (
        fallback
      )}
    </div>
  );
}
