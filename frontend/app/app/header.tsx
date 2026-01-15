"use client"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import Image from "next/image";
import Link from "next/link";
import logo from "@/lib/images/example-logo.png";
import { Menu } from 'lucide-react';
import { useEffect, useState } from "react";
import { ModeToggle } from "@/components/mode-toggle";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"

export function Header() {
    const [isSticky, setIsSticky] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsSticky(window.scrollY > 0);
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <header
            className={`sticky top-0 z-50 w-full bg-background border-b ${isSticky ? "border-border" : "border-transparent"
                }`}
        >
            <div className="flex items-center justify-between px-4 py-3">

                {/* VÄNSTER */}
                <div className="flex items-center gap-2">
                    
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Menu />
                            </Button>
                        </SheetTrigger>
                    

                    <Button variant="ghost" asChild>
                        <Link href="/">Home</Link>
                    </Button>

                    <Button variant="ghost" asChild>
                        <Link href="/about">About</Link>
                    </Button>
                </div>

                {/* HÖGER */}
                <div className="flex items-center gap-2">
                    <ModeToggle />
                    <Avatar className="rounded-lg">
                        <AvatarImage
                            src="https://github.com/evilrabbit.png"
                            alt="@evilrabbit"
                        />
                        <AvatarFallback>ER</AvatarFallback>
                    </Avatar>
                    <Image src={logo} alt="Logo" width={120} height={40} />
                </div>

            </div>
        </header>
    );
}
