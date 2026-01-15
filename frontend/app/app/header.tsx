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
import { use, useEffect, useState } from "react";
import { ModeToggle } from "@/components/mode-toggle";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


export function Header({ user }: { user: any | null }) {
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
                    <Icon user={user}></Icon>
                    <Image src={logo} alt="Logo" width={120} height={40} />
                </div>

            </div>
        </header>
    );
}

function Icon({ user }: { user: any | null }) {
    console.log("User in Icon component:", user);
    const isLoggedIn = !!user;

    async function logout() {
        // Clear the token cookie by setting it to an expired date
        await fetch("http://localhost:5005/users/logout", {
            method: "POST",
            credentials: "include",
        });
        // Optionally, you can redirect the user to the login page or homepage
        window.location.href = "/";
    }


    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Avatar
                    className={`rounded-lg cursor-pointer ${!isLoggedIn && "opacity-60"
                        }`}
                >
                    <AvatarImage
                        src="https://github.com/evilrabbit.png"
                        alt="avatar"
                    />
                    <AvatarFallback>ER</AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel>
                    {isLoggedIn ? user.username : "Guest"}
                </DropdownMenuLabel>

                <DropdownMenuGroup>
                    <DropdownMenuItem disabled={!isLoggedIn}>
                        Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={!isLoggedIn}>
                        Billing
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={!isLoggedIn}>
                        Settings
                    </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuItem disabled={!isLoggedIn}>
                    Support
                </DropdownMenuItem>

                <DropdownMenuItem disabled>
                    API
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {isLoggedIn ? (
                    <DropdownMenuItem onClick={logout}className="text-red-600">
                        Log out
                    </DropdownMenuItem>
                ) : (
                    <DropdownMenuItem>
                        <Link href="/login">Log in</Link>
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
