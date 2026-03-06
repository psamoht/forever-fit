import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { MoveRight, Heart, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col gap-10 pt-8 animate-in fade-in duration-700">

      {/* Hero Section */}
      <div className="space-y-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-1.5 text-orange-700">
          <Sparkles size={16} />
          <span className="text-sm font-semibold">Täglich besser fühlen</span>
        </div>
        <h1 className="text-5xl font-extrabold text-slate-800 tracking-tight leading-11">
          Länger fit, <br />
          <span className="text-primary">jeden Tag.</span>
        </h1>
        <p className="text-xl text-slate-600 leading-relaxed max-w-sm mx-auto">
          Dein persönlicher AI-Coach, der sich um deine Gesundheit kümmert. Einfach, sicher und geduldig.
        </p>
      </div>

      {/* Feature Card */}
      <Card className="p-8 border-none bg-gradient-to-br from-white to-green-50 shadow-2xl shadow-green-900/5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-green-100/50 blur-3xl group-hover:bg-green-200/50 transition-colors" />

        <div className="relative space-y-4">
          <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-green-600">
            <Heart className="h-6 w-6 fill-current" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Heute beginnen</h2>
          <p className="text-lg text-slate-600">
            Starte jetzt deine Reise mit Coach Theo. Er erstellt einen Plan, der genau zu dir passt.
          </p>
        </div>
      </Card>

      {/* CTA */}
      <div className="mt-4">
        <Button asChild size="lg" className="w-full text-xl h-20 shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all">
          <Link href="/auth">
            Jetzt loslegen <MoveRight className="ml-3 h-6 w-6" />
          </Link>
        </Button>
      </div>

      <div className="text-center">
        <p className="text-slate-400 text-sm font-medium uppercase tracking-widest">
          Einfach • Sicher • Persönlich
        </p>
      </div>
    </div>
  );
}
