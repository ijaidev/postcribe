"use client";

import { ShimmerButton } from "@/components/magicui/shimmer-button";
import Link from "next/link";

const LastCta = () => {
    return (
        <section
            id="final-cta"
            className="flex w-full flex-col items-center justify-center p-4 text-center"
        >
            <div className="mx-auto max-w-3xl">
                <h2 className="text-foreground text-4xl font-bold md:text-6xl">
                    Begin Your Masterpiece.
                </h2>
                <p className="text-muted-foreground mt-6 text-lg md:text-xl">
                    Start Free. No credit card required.
                </p>
                <div className="mt-10 flex max-h-20 w-full items-center justify-center">
                    <ShimmerButton className="text-primary text-lg font-medium">
                        <Link href="/signin">Create Your Free Account</Link>
                    </ShimmerButton>
                </div>
            </div>
        </section>
    );
};

export default LastCta;
