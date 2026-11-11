import React, { useEffect, useMemo, useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import "./HomePage.css";
import { useNavigate } from "react-router-dom";

const WORD_EASE = [0.16, 1, 0.3, 1];

const WordsPullUp = ({ text, className = "", showAsterisk = false }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-10% 0px" });
  const words = useMemo(() => text.split(" "), [text]);

  return (
    <span ref={ref} className={`words-pullup ${className}`}>
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          className="word"
          initial={{ y: 20, opacity: 0 }}
          animate={isInView ? { y: 0, opacity: 1 } : {}}
          transition={{
            duration: 0.6,
            ease: WORD_EASE,
            delay: index * 0.08,
          }}
        >
          <span
            className={
              index === words.length - 1 && showAsterisk
                ? "word-asterisk"
                : ""
            }
          >
            {word}
            {index === words.length - 1 && showAsterisk ? (
              <span className="asterisk">*</span>
            ) : null}
          </span>
          {index < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </span>
  );
};

const WordsPullUpMultiStyle = ({ segments, className = "" }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-10% 0px" });
  const words = useMemo(() => {
    const output = [];
    segments.forEach((segment, segmentIndex) => {
      const splitWords = segment.text.split(" ");
      splitWords.forEach((word, wordIndex) => {
        output.push({
          word,
          className: segment.className || "",
          key: `${segmentIndex}-${wordIndex}-${word}`,
        });
      });
    });
    return output;
  }, [segments]);

  return (
    <span ref={ref} className={`words-pullup multi ${className}`}>
      {words.map((item, index) => (
        <motion.span
          key={item.key}
          className={`word ${item.className}`}
          initial={{ y: 20, opacity: 0 }}
          animate={isInView ? { y: 0, opacity: 1 } : {}}
          transition={{
            duration: 0.6,
            ease: WORD_EASE,
            delay: index * 0.08,
          }}
        >
          {item.word}
          {index < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </span>
  );
};

const AnimatedLetter = ({ char, progress, range }) => {
  const opacity = useTransform(progress, range, [0.2, 1]);
  return (
    <motion.span className="about-letter" style={{ opacity }}>
      {char}
    </motion.span>
  );
};

const HomePage = () => {
  const navigate = useNavigate();
  const aboutRef = useRef(null);
  const featuresRef = useRef(null);
  const heroVideoRef = useRef(null);
  const featureVideoRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: aboutRef,
    offset: ["start 0.8", "end 0.2"],
  });

  const aboutText =
    "From interview prep to hack nights and classrooms, CodeSync keeps every cursor aligned. Share a room link, watch edits appear instantly, and run code with zero setup so your team can stay in flow.";
  const aboutChars = useMemo(() => aboutText.split(""), [aboutText]);
  const featuresInView = useInView(featuresRef, {
    once: true,
    margin: "-100px 0px",
  });

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: (index) => ({
      opacity: 1,
      scale: 1,
      transition: {
        delay: index * 0.15,
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
      },
    }),
  };

  useEffect(() => {
    const videos = [heroVideoRef.current, featureVideoRef.current].filter(Boolean);
    if (!videos.length) return;

    const tryPlay = (video) => {
      if (!video || document.visibilityState !== "visible") return;
      video.muted = true;
      video.playsInline = true;
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        videos.forEach((video) => tryPlay(video));
      }
    };

    const handlers = new Map();
    videos.forEach((video) => {
      const onReady = () => tryPlay(video);
      const onPause = () => tryPlay(video);
      const onEnded = () => tryPlay(video);

      handlers.set(video, { onReady, onPause, onEnded });
      video.addEventListener("loadeddata", onReady);
      video.addEventListener("pause", onPause);
      video.addEventListener("ended", onEnded);
      tryPlay(video);
    });

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      videos.forEach((video) => {
        const handler = handlers.get(video);
        if (!handler) return;
        video.removeEventListener("loadeddata", handler.onReady);
        video.removeEventListener("pause", handler.onPause);
        video.removeEventListener("ended", handler.onEnded);
      });
    };
  }, []);

  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-shell">
          <video
            ref={heroVideoRef}
            className="hero-video"
            //https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4
            //https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
          />
          <div className="noise-overlay" />
          <div className="hero-gradient" />

          <div className="hero-nav">
            <div className="hero-nav-pill">
              <button
                className="hero-nav-button"
                onClick={() => navigate("/Home")}
              >
                Join a room
              </button>
              <button
                className="hero-nav-button hero-nav-primary"
                onClick={() => navigate("/Home")}
              >
                Create room
              </button>
            </div>
          </div>

          <div className="hero-content">
            <div className="hero-title">
              <WordsPullUp
                text="CodeSync"
                className="hero-heading"
              />
            </div>
            <div className="hero-copy">
              {/* <motion.p
                className="hero-description"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4, ease: WORD_EASE }}
              >
                Code together in real time from anywhere.
                <br />
                Share a room, sync instantly, and ship faster.
              </motion.p> */}
              <motion.button
                className="cta-button"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.55, ease: WORD_EASE }}
                onClick={() => navigate("/Home")}
              >
                <span>Start collaborating</span>
                <span className="cta-icon">
                  <ArrowRight size={18} />
                </span>
              </motion.button>
            </div>
          </div>
        </div>
      </section>

      <section className="about">
        <div className="about-card">
          <span className="about-label">Code collaboration</span>
          <div className="about-heading">
            <WordsPullUpMultiStyle
              segments={[
                { text: "CodeSync is built for teams,", className: "" },
                { text: "a real-time editor in motion.", className: "accent-serif" },
                { text: "Pair, teach, review, and ship together.", className: "" },
              ]}
            />
          </div>
          <p ref={aboutRef} className="about-body">
            {aboutChars.map((char, index) => {
              const progress = index / aboutChars.length;
              const start = Math.max(progress - 0.1, 0);
              const end = Math.min(progress + 0.05, 1);
              return (
                <AnimatedLetter
                  key={`${char}-${index}`}
                  char={char}
                  progress={scrollYProgress}
                  range={[start, end]}
                />
              );
            })}
          </p>
        </div>
      </section>

      <section className="features">
        <div className="bg-noise" />
        <div className="features-inner">
          <div className="features-heading">
            <WordsPullUpMultiStyle
              className="features-title"
              segments={[
                {
                  text: "Studio-grade collaboration for modern teams.",
                  className: "",
                },
              ]}
            />
            <WordsPullUpMultiStyle
              className="features-subtitle"
              segments={[
                {
                  text: "Built for live code. Powered by presence.",
                  className: "features-muted",
                },
              ]}
            />
          </div>

          <div ref={featuresRef} className="features-grid">
            <motion.div
              className="feature-card feature-card-video"
              variants={cardVariants}
              initial="hidden"
              animate={featuresInView ? "visible" : "hidden"}
              custom={0}
            >
              <video
                ref={featureVideoRef}
                className="feature-video"
                src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4"
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                disablePictureInPicture
              />
              <div className="feature-video-text">Code effortlessly</div>
            </motion.div>

            <motion.div
              className="feature-card"
              variants={cardVariants}
              initial="hidden"
              animate={featuresInView ? "visible" : "hidden"}
              custom={1}
            >
              <img
                className="feature-icon"
                src="https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260405_171918_4a5edc79-d78f-4637-ac8b-53c43c220606.png&w=1280&q=85"
                alt="Live rooms"
              />
              <div className="feature-title">
                <span className="feature-index">01</span> Live Rooms.
              </div>
              <ul className="feature-list">
                <li>
                  <Check size={16} />
                  Instant room links
                </li>
                <li>
                  <Check size={16} />
                  Code sync
                </li>
                <li>
                  <Check size={16} />
                  Reconnect without losing state
                </li>
                <li>
                  <Check size={16} />
                  Presence-aware roster
                </li>
              </ul>
              <button className="feature-link">
                Learn more <ArrowRight size={16} />
              </button>
            </motion.div>

            <motion.div
              className="feature-card"
              variants={cardVariants}
              initial="hidden"
              animate={featuresInView ? "visible" : "hidden"}
              custom={2}
            >
              <img
                className="feature-icon"
                src="https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260405_171741_ed9845ab-f5b2-4018-8ce7-07cc01823522.png&w=1280&q=85"
                alt="Run and review"
              />
              <div className="feature-title">
                <span className="feature-index">02</span> Run & Review.
              </div>
              <ul className="feature-list">
                <li>
                  <Check size={16} />
                  Run code in 15+ languages
                </li>
                <li>
                  <Check size={16} />
                  Shared output for everyone
                </li>
                <li>
                  <Check size={16} />
                  Inline discussion while you code
                </li>
              </ul>
              <button className="feature-link">
                Learn more <ArrowRight size={16} />
              </button>
            </motion.div>

            <motion.div
              className="feature-card"
              variants={cardVariants}
              initial="hidden"
              animate={featuresInView ? "visible" : "hidden"}
              custom={3}
            >
              <img
                className="feature-icon"
                src="https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260405_171809_f56666dc-c099-4778-ad82-9ad4f209567b.png&w=1280&q=85"
                alt="Focus mode"
              />
              <div className="feature-title">
                <span className="feature-index">03</span> Focus Mode.
              </div>
              <ul className="feature-list">
                <li>
                  <Check size={16} />
                  Noise-free editor layout
                </li>
                <li>
                  <Check size={16} />
                  Mobile-ready pairing
                </li>
                <li>
                  <Check size={16} />
                  Stay synced across devices
                </li>
              </ul>
              <button className="feature-link">
                Learn more <ArrowRight size={16} />
              </button>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
