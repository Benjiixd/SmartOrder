import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export function Header() {

    return (
        <header className="sticky top-0 z-50 w-full bg-blue-600 text-white p-4">
        <h1 className="text-3xl font-bold">My Application Header</h1>
            <SheetTrigger asChild>
                <Button variant="outline">Navigation</Button>
            </SheetTrigger>
        </header>
    );
}
