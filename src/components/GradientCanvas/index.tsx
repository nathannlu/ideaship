"use client";

import React, { useRef, useState, useEffect, useLayoutEffect } from "react";
import { Gradient } from "./lib";
import { motion } from "framer-motion"

export const Canvas = ({height = '100%'}) => {
  const [isVisible, setIsVisible] = useState(false);
	useEffect(() => {
		var gradient = new Gradient() as any;
		gradient.initGradient("#gradient-canvas");
    setIsVisible(true)
	});

/*
  setTimeout(()=>{
    setIsVisible(true);
  },2000)
  */

	return (
		<>
      <motion.div
        style={{
          position: "absolute",
          width: "100%",
          height: '100vh',
          top: 0,
          left: 0,
          zIndex: -1,
          opacity: 0,
        }}
        animate={{ opacity: isVisible ? 1 : 0 }}
      >
        <canvas
          id="gradient-canvas"
          style={{height: '100%'}}
        ></canvas>
      </motion.div>
       {/* Fade bottom of canvas into black background */}
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            top: 0,
            left: 0,
            // Transparent until 70%, then fade to black at bottom
            backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 60%, rgba(0,0,0,1) 100%)',
            zIndex: -1,
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            top: 0,
            left: 0,
            background:'black',
            zIndex: -2,
          }}
        ></div>
 		</>
	);
};
