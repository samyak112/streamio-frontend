import React, { useCallback, useEffect, useRef, useState } from 'react'
import Webcam from "react-webcam";
const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: "user" // front camera on mobiles
  };

function Stream() {
  const webcamRef = useRef(null);
  const [isCamera, setisCamera] = useState(true)

  const handleVideo = useCallback(() => {
    const stream = webcamRef.current?.stream;

    if (stream) {
      if (isCamera) {
        setisCamera(false)
        // Turn off video tracks
        stream.getVideoTracks().forEach((track) => track.stop());
      } else {
        setisCamera(true)
        // To start video again, we just re-render by toggling state
        // This will cause Webcam to request new media stream with video
      }
    }
    setisCamera((v) => !v);
  }, [isCamera]);

  return (
    <div style={{height:'100%',display:'grid',gridTemplateRows:'auto 3rem'}}>
        <div>

         <Webcam
        audio={true}                // enables microphone
        videoConstraints={videoConstraints}
        ref={webcamRef}
        autoPlay
        mirrored={true}
        playsInline
        />
        </div>
      <div style={{display:'flex',justifyContent:'center'}}>
        <div style={{border:'2px solid white',width:'10rem',display:'flex',justifyContent:'center',alignItems:'center'}}>
            <div onClick={handleVideo}>
                Turn Camera on
            </div>
        </div>
      </div>
    </div>
  )
}

export default Stream