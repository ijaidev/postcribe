"use client";

import { useState } from "react";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { CircleUserRound } from "lucide-react";

const posts = {
    x: [
        {
            version: 1,
            prompt: "Introduce Postcribe",
            text: "Postcribe is a platform that allows you to create social media content for multiple platforms at once with just one prompt.",
        },
        {
            version: 2,
            prompt: "Present it in a funny sarcastic way",
            text: "Oh, you’re still crafting individual posts for every social platform like it’s 2015? Bless your heart. Postcribe lets you whip up content for X, LinkedIn, and beyond with one glorious prompt. Save your sanity, keyboard warrior.",
        },
        {
            version: 3,
            prompt: "Add a exciting CTA so people can't stop themselves from using it",
            text: "Tired of juggling social media posts like a circus clown? With Postcribe, create killer content for every platform in one go! Don’t wait, try Postcribe NOW. Your followers are begging for it!",
        },
    ],
    linkedin: [
        {
            version: 1,
            prompt: "Introduce Postcribe professionally",
            text: "Postcribe streamlines your social media strategy by enabling you to create tailored content for multiple platforms from a single prompt, saving time and boosting efficiency.",
        },
        {
            version: 2,
            prompt: "Present it with a professional yet engaging tone",
            text: "Struggling to keep up with content demands across platforms? Postcribe empowers you to craft impactful posts for X, LinkedIn, and more with just one prompt. Simplify your workflow and elevate your brand’s presence today.",
        },
        {
            version: 3,
            prompt: "Add a compelling CTA for professionals",
            text: "Ready to transform your social media game? Postcribe lets you create polished, platform-ready content in minutes. Join thousands of professionals saving time and shining online—start with Postcribe today!",
        },
    ],
};

interface TabProps {
    text: string;
    selected: boolean;
    setSelected: (text: "x" | "linkedin") => void;
}

export function Tab({ text, selected, setSelected }: TabProps) {
    return (
        <button
            onClick={() => setSelected(text as "x" | "linkedin")}
            className={cn(
                "relative w-fit px-4 py-2 text-sm font-semibold capitalize",
                "text-foreground transition-colors",
            )}
        >
            <span className="relative z-10">
                {text === "x" ? "X/Twitter" : text}
            </span>
            {selected && (
                <motion.span
                    layoutId="tab"
                    transition={{ type: "spring", duration: 0.4 }}
                    className="bg-background absolute inset-0 z-0 rounded-sm shadow-sm"
                />
            )}
        </button>
    );
}

const HistorySection = () => {
    const [version, setVersion] = useState(3);
    const [activeTab, setActiveTab] = useState<"x" | "linkedin">("x");

    const currentPost = posts[activeTab].find(post => post.version === version);

    return (
        <div className="flex w-full flex-col items-center justify-center space-y-8">
            <div>
                <h3 className="text-foreground text-center text-3xl font-bold md:text-4xl">
                    Full Creative Control.
                </h3>
                <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-center text-lg">
                    Every draft, suggestion, and image is saved. Freely
                    experiment with the confidence of a complete version
                    history.
                </p>
            </div>

            <div className="bg-muted flex w-fit rounded-md p-1">
                {Object.keys(posts).map(key => (
                    <Tab
                        key={key}
                        text={key}
                        selected={activeTab === key}
                        setSelected={setActiveTab}
                    />
                ))}
            </div>
            <div className="flex min-h-80 items-center gap-10">
                <AnimatePresence mode="wait">
                    {currentPost && (
                        <div className="flex h-full items-start justify-center">
                            <div className="flex flex-col gap-4">
                                <div className="flex items-start gap-2">
                                    <CircleUserRound className="mt-1 size-8" />
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5 }}
                                        key={`${activeTab}-${currentPost.version}`}
                                        className="bg-muted border-border flex max-w-lg items-center justify-center rounded-xl p-5 pt-3 pl-3"
                                    >
                                        <p>{currentPost.prompt}</p>
                                    </motion.div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Image
                                        src={"/postcribe-logo-small.png"}
                                        alt="Postcribe Logo"
                                        className="mt-1 rounded-full border invert"
                                        width={30}
                                        height={30}
                                    />
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5 }}
                                        key={`${activeTab}-${currentPost.version}`}
                                        className="bg-muted border-border flex max-w-lg items-center justify-center rounded-xl p-10 pt-5 pl-5"
                                    >
                                        <p>{currentPost.text}</p>
                                    </motion.div>
                                </div>
                            </div>
                        </div>
                    )}
                </AnimatePresence>
                <RadioGroup
                    value={version.toString()}
                    onValueChange={value => setVersion(Number(value))}
                    className="flex flex-col gap-5"
                >
                    {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="flex items-center gap-4">
                            <RadioGroupItem
                                value={(index + 1).toString()}
                                className="h-4 w-4"
                            ></RadioGroupItem>
                            <Label>Version {index + 1}</Label>
                        </div>
                    ))}
                </RadioGroup>
            </div>
        </div>
    );
};

export default HistorySection;
