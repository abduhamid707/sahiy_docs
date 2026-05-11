import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { Document } from "@/models/Document";
import { Category } from "@/models/Category";
import { Project } from "@/models/Project";
import Link from "next/link";
import { FileText, Clock, ArrowRight } from "lucide-react";

export default async function Dashboard() {
  const session = await auth();
  const userRole = (session?.user as any)?.role;

  await dbConnect();
  
  const recentDocs = await Document.find({
    allowedRoles: userRole
  })
  .populate({
    path: 'categoryId',
    model: Category,
    populate: { path: 'projectId', model: Project }
  })
  .sort({ updatedAt: -1 })
  .limit(5);

  return (
    <div className="space-y-6 sm:space-y-10 animate-in fade-in duration-700">
      <div className="bg-brand-blue p-6 sm:p-10 rounded-3xl text-white shadow-2xl shadow-blue-900/20 relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-4xl font-extrabold mb-2 tracking-tight">Xush kelibsiz, {session?.user?.name || "Foydalanuvchi"}! 👋</h1>
          <p className="text-slate-200 text-base sm:text-lg opacity-90 font-medium">
            Sahiy Market hujjatlari va standartlari platformasiga xush kelibsiz.
          </p>
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-10 scale-100 sm:scale-150 transform translate-x-10 -translate-y-10 hidden sm:block">
          <FileText size={200} className="text-gold-2" />
        </div>
      </div>
 
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-10">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-3">
              <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              Oxirgi o'zgarishlar
            </h2>
            <Link href="/projects" className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center gap-1 group">
              Hammasini ko'rish <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
          <div className="bg-card/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl border border-border shadow-xl shadow-slate-200/20 dark:shadow-none divide-y divide-border overflow-hidden">
            {recentDocs.length > 0 ? (
              recentDocs.map((doc: any) => (
                <Link 
                  key={doc._id.toString()} 
                  href={`/docs/${doc._id}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-5 sm:p-6 hover:bg-muted/30 dark:hover:bg-slate-800/30 transition-all group gap-4"
                >
                  <div className="flex items-center gap-4 sm:gap-5">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-muted/50 flex items-center justify-center group-hover:bg-muted/80 transition-colors shadow-inner shrink-0">
                      <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-base sm:text-lg mb-0.5 truncate">{doc.title}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider truncate max-w-[100px] sm:max-w-none">{doc.categoryId?.projectId?.name}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-[10px] sm:text-xs text-muted-foreground font-medium truncate max-w-[100px] sm:max-w-none">{doc.categoryId?.name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:text-right sm:block border-t sm:border-0 pt-4 sm:pt-0 border-border">
                    <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-tighter">{new Date(doc.updatedAt).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })}</p>
                    <div className="h-8 w-8 rounded-full flex items-center justify-center group-hover:bg-brand-blue group-hover:text-white transition-all sm:ml-auto sm:mt-2 bg-muted/50">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-16 text-center">
                <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-slate-300" />
                </div>
                <p className="text-gray-400 font-medium italic">Hozircha faoliyat mavjud emas.</p>
              </div>
            )}
          </div>
        </div>
 
        <div className="space-y-8">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Tezkor amallar</h2>
          <div className="grid grid-cols-1 gap-5">
            <Link href="/projects" className="group p-6 bg-brand-blue text-white rounded-3xl shadow-xl shadow-blue-900/20 hover:scale-[1.02] transition-all relative overflow-hidden">
              <div className="relative z-10 space-y-2">
                <span className="font-bold text-lg sm:text-xl block">Loyihalarni ko'rish</span>
                <span className="text-xs sm:text-sm text-slate-300 block font-medium">Barcha bo'limlar hujjatlariga kirish.</span>
              </div>
              <ArrowRight className="absolute bottom-6 right-6 h-6 w-6 text-slate-500 group-hover:text-gold-2 transition-colors" />
            </Link>
            
            <Link href="/admin/docs/new" className="group p-6 bg-card border border-border rounded-3xl shadow-lg hover:shadow-xl hover:border-brand-blue transition-all relative">
              <div className="space-y-2">
                <span className="font-bold text-lg sm:text-xl text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors block">Hujjat yaratish</span>
                <span className="text-xs sm:text-sm text-muted-foreground block font-medium">Yangi qo'llanma yoki texnik spetsifikatsiya qo'shish.</span>
              </div>
              <div className="absolute bottom-6 right-6 h-10 w-10 bg-muted rounded-xl flex items-center justify-center group-hover:bg-muted/80 transition-colors">
                <FileText className="h-5 w-5 text-muted-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
              </div>
            </Link>
          </div>

          <div className="bg-muted rounded-3xl p-6 border border-border">
            <h3 className="font-bold text-foreground mb-4 tracking-tight">Eslatma 💡</h3>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium">
              Agar biror hujjatda xatolik topsangiz yoki yangi ma'lumot qo'shmoqchi bo'lsangiz, tegishli bo'limga murojaat qiling yoki tahrirlash huquqiga ega bo'lsangiz, o'zingiz o'zgartiring.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

