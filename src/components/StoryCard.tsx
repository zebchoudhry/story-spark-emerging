import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, ExternalLink, Clock, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { getGenre } from "@/config/genres";

export interface StoryCardData {
  id: string;
  title: string;
  summaryShort: string;
  category: string;
  trendScore: "hot" | "warm" | "cold";
  credibility: "low" | "medium" | "high";
  sourceName: string;
  publishedAt: string;
  genreId?: string;
}

interface StoryCardProps {
  story: StoryCardData;
}

function getCategoryLabel(genreId: string, categoryId: string): string {
  const genre = getGenre(genreId || "paranormal");
  if (!genre) return categoryId.replace(/_/g, " ");
  const cat = genre.categories.find((c) => c.id === categoryId);
  return cat?.label ?? categoryId.replace(/_/g, " ");
}

const trendVariantMap = {
  hot: "destructive",
  warm: "warning",
  cold: "secondary",
} as const;

const trendLabels = {
  hot: "HOT",
  warm: "WARM",
  cold: "COLD",
};

const credibilityLabels = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const StoryCard = ({ story }: StoryCardProps) => {
  return (
    <Link to={`/app/story/${story.id}`}>
      <Card variant="story" className="h-full cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">
              {getCategoryLabel(story.genreId ?? "paranormal", story.category)}
            </Badge>
            <Badge variant={trendVariantMap[story.trendScore]}>
              <TrendingUp className="h-3 w-3 mr-1" />
              {trendLabels[story.trendScore]}
            </Badge>
          </div>
          <CardTitle className="line-clamp-2 hover:text-primary transition-colors">
            {story.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
            {story.summaryShort}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <ExternalLink className="h-3 w-3" />
                {story.sourceName}
              </span>
              <span className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                {credibilityLabels[story.credibility]}
              </span>
            </div>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {story.publishedAt}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
