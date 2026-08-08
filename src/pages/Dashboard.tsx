import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StoryCard, StoryCardData } from "@/components/StoryCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Zap,
  Ghost,
  Loader2,
  TrendingUp,
  Skull,
  Footprints,
  Eye,
  HelpCircle,
  Newspaper,
  Cpu,
  Trophy,
  UtensilsCrossed,
  Briefcase,
  Gamepad2,
  Heart,
  Brain,
  Rocket,
  Shield,
  Smartphone,
  FlaskConical,
  Coins,
  Circle,
  CircleDot,
  ArrowRightLeft,
  BarChart3,
  Store,
  ChefHat,
  Star,
  MapPin,
  Apple,
  LineChart,
  Lightbulb,
  Wallet,
  Home,
  Users,
  Calendar,
  Clock,
  Building2,
  Wrench,
  Dumbbell,
  Sparkles,
  Stethoscope,
  Bot,
  FileCode,
  Server,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Constants } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { getAllGenres, getGenre } from "@/config/genres";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap,
  Ghost,
  TrendingUp,
  Skull,
  Footprints,
  Eye,
  HelpCircle,
  Newspaper,
  Cpu,
  Trophy,
  UtensilsCrossed,
  Briefcase,
  Gamepad2,
  Heart,
  Brain,
  Rocket,
  Shield,
  Smartphone,
  FlaskConical,
  Coins,
  Circle,
  CircleDot,
  ArrowRightLeft,
  BarChart3,
  Store,
  ChefHat,
  Star,
  MapPin,
  Apple,
  LineChart,
  Lightbulb,
  Wallet,
  Home,
  Users,
  Calendar,
  Clock,
  Building2,
  Wrench,
  Dumbbell,
  Sparkles,
  Stethoscope,
  Bot,
  FileCode,
  Server,
};

const trendFilters = [
  { id: "all", label: "All Trends" },
  { id: "hot", label: "HOT" },
  { id: "warm", label: "WARM" },
  { id: "cold", label: "COLD" },
];

const Dashboard = () => {
  const [stories, setStories] = useState<StoryCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTrend, setSelectedTrend] = useState("all");
  const [selectedGenre, setSelectedGenre] = useState(
    () => localStorage.getItem("selected_genre") || "ai"
  );
  const { toast } = useToast();

  useEffect(() => {
    localStorage.setItem("selected_genre", selectedGenre);
  }, [selectedGenre]);

  const fetchStories = useCallback(async () => {
    try {
      setIsLoading(true);
      const allowed = Constants.public.Enums.story_category as readonly string[];
      const categoryIds = (getGenre(selectedGenre)?.categories ?? [])
        .map((c) => c.id)
        .filter((id) => allowed.includes(id));
      if (categoryIds.length === 0) {
        setStories([]);
        return;
      }
      const { data, error } = await supabase
        .from("story_cards")
        .select("id, title, summary_short, category, trend_score, credibility, source_name, published_at")
        .in("category", categoryIds as unknown as ("ufo")[])
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      const formattedStories: StoryCardData[] = (data || []).map((story) => ({
        id: story.id,
        title: story.title,
        summaryShort: story.summary_short,
        category: story.category,
        trendScore: story.trend_score as "hot" | "warm" | "cold",
        credibility: story.credibility as "low" | "medium" | "high",
        sourceName: story.source_name,
        publishedAt: story.published_at 
          ? formatDistanceToNow(new Date(story.published_at), { addSuffix: true })
          : "Recently",
        genreId: selectedGenre,
      }));

      setStories(formattedStories);
    } catch (error) {
      console.error("Error fetching stories:", error);
      toast({
        title: "Error loading stories",
        description: "Please try refreshing the page.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedGenre, toast]);

  useEffect(() => {
    setSelectedCategory("all");
    fetchStories();
  }, [selectedGenre, fetchStories]);

  const filteredStories = stories.filter((story) => {
    const matchesSearch = story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.summaryShort.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || story.category === selectedCategory;
    const matchesTrend = selectedTrend === "all" || story.trendScore === selectedTrend;
    return matchesSearch && matchesCategory && matchesTrend;
  });

  const currentGenre = getGenre(selectedGenre) ?? getGenre("paranormal")!;
  const categories = [
    { id: "all", label: "All", icon: Zap },
    ...currentGenre.categories.map((cat) => ({
      id: cat.id,
      label: cat.label,
      icon: iconMap[cat.icon] ?? Zap,
    })),
  ];

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold mb-2">Story Feed</h1>
        <p className="text-muted-foreground">
          Discover the latest mysteries and unexplained events
        </p>
      </div>

      {/* Genre Selector */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {getAllGenres().map((genre) => {
            const GenreIcon = iconMap[genre.icon] ?? Zap;
            return (
              <Button
                key={genre.id}
                variant={selectedGenre === genre.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedGenre(genre.id)}
                className="gap-2"
              >
                <GenreIcon className="h-4 w-4" />
                {genre.name}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search stories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {trendFilters.map((trend) => (
              <Button
                key={trend.id}
                variant={selectedTrend === trend.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTrend(trend.id)}
              >
                {trend.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const CatIcon = cat.icon;
            return (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "glow" : "ghost"}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                className="gap-2"
              >
                <CatIcon className="h-4 w-4" />
                {cat.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Stories Grid */}
      {!isLoading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStories.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      )}

      {!isLoading && filteredStories.length === 0 && (
        <div className="text-center py-16">
          <Ghost className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display text-xl font-semibold mb-2">
            No {currentGenre.name} stories found yet
          </h3>
          <p className="text-muted-foreground">
            {stories.length === 0 
              ? "Stories are being collected. Check back soon!"
              : "Try adjusting your filters or search query"}
          </p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Dashboard;
