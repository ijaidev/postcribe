"use client";

import { motion } from "motion/react";
const Hero1 = () => {
    return (
        <div className="relative flex min-h-screen flex-col overflow-x-hidden">
            {/* Gradient */}
            <div className="absolute top-[-40rem] right-[-30rem] z-[0] flex rotate-[-20deg] skew-[-40deg] gap-[10rem] opacity-50 blur-[4rem]">
                <div className="h-[20rem] w-[10rem] bg-linear-90 from-white to-blue-300"></div>
                <div className="h-[20rem] w-[10rem] bg-linear-90 from-white to-blue-300"></div>
                <div className="h-[20rem] w-[10rem] bg-linear-90 from-white to-blue-300"></div>
            </div>
            <div className="absolute top-[-50rem] right-[-50rem] z-[0] flex rotate-[-20deg] skew-[-40deg] gap-[10rem] opacity-50 blur-[4rem]">
                <div className="h-[20rem] w-[10rem] bg-linear-90 from-white to-blue-300"></div>
                <div className="h-[20rem] w-[10rem] bg-linear-90 from-white to-blue-300"></div>
                <div className="h-[20rem] w-[10rem] bg-linear-90 from-white to-blue-300"></div>
            </div>
            <div className="absolute top-[-60rem] right-[-60rem] z-[0] flex rotate-[-20deg] skew-[-40deg] gap-[10rem] opacity-50 blur-[4rem]">
                <div className="h-[30rem] w-[10rem] bg-linear-90 from-white to-blue-300"></div>
                <div className="h-[30rem] w-[10rem] bg-linear-90 from-white to-blue-300"></div>
                <div className="h-[30rem] w-[10rem] bg-linear-90 from-white to-blue-300"></div>
            </div>

            <section
                id="hero"
                className="relative flex h-screen w-full flex-col items-center justify-center p-4 text-center"
            >
                <div className="mx-auto max-w-3xl">
                    <motion.h1
                        className="text-foreground text-4xl font-bold md:text-6xl lg:text-7xl"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                    >
                        Your Idea, Perfectly Composed
                    </motion.h1>
                    <motion.p
                        className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg md:text-xl"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.8 }}
                    >
                        Postcribe transforms your core message into tailored,
                        ready-to-publish posts for X and LinkedIn. Powered by an
                        AI that understands nuance.
                    </motion.p>
                    <motion.div
                        className="mt-10"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 1.1 }}
                    >
                        <a
                            href="#final-cta"
                            id="hero-cta"
                            className="text-primary hover:border-primary inline-block rounded-lg border-2 border-transparent px-6 py-3 text-lg font-medium transition-all duration-300"
                        >
                            Start Crafting &rarr;
                        </a>
                    </motion.div>
                </div>
            </section>
        </div>
    );
};

export { Hero1 };
