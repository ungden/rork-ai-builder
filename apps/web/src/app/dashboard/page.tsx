import Link from 'next/link';
import { Plus, Folder, Clock, Sparkles, Zap, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { CreateProjectButton } from '@/components/dashboard/CreateProjectButton';
import { ProjectCard } from '@/components/dashboard/ProjectCard';

export default async function DashboardPage() {
  const supabase = await createClient();
  
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Your Projects</h1>
          <p className="text-muted-foreground">Create and manage your mobile apps</p>
        </div>
        
        <CreateProjectButton />
      </div>
      
      {/* Quick Start */}
      {(!projects || projects.length === 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/demo"
            className="p-6 bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-xl hover:border-purple-500/50 transition-all group"
          >
            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="font-semibold mb-1">Try Demo Mode</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Experience AI-powered app building without signing up
            </p>
            <span className="text-sm text-purple-400 flex items-center gap-1">
              Try it now <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
          
          <div className="p-6 bg-muted border border-border rounded-xl">
            <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="font-semibold mb-1">Quick Start</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Describe your app idea and let AI generate it instantly
            </p>
            <CreateProjectButton variant="secondary" />
          </div>
          
          <div className="p-6 bg-muted border border-border rounded-xl opacity-70">
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4">
              <Folder className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="font-semibold mb-1">Templates</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Start from pre-built app templates (coming soon)
            </p>
            <span className="text-sm text-muted-foreground">Coming soon</span>
          </div>
        </div>
      )}

      {/* Projects Grid */}
      {projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Folder className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
          <p className="text-muted-foreground mb-6">
            Create your first mobile app to get started
          </p>
          <CreateProjectButton />
        </div>
      )}
    </div>
  );
}
