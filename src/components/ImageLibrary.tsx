
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Download, Trash2, User, Image } from "lucide-react";
import { GeneratedImage } from "@/pages/ImageCreation";

interface ImageLibraryProps {
  images: GeneratedImage[];
  mode: "character" | "general";
}

export const ImageLibrary = ({ images, mode }: ImageLibraryProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "character" | "general">("all");

  const filteredImages = images.filter((image) => {
    const matchesSearch = image.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (image.characterName?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = activeFilter === "all" || 
                         (activeFilter === "character" && image.isCharacter) ||
                         (activeFilter === "general" && !image.isCharacter);
    
    return matchesSearch && matchesFilter;
  });

  const characterImages = filteredImages.filter(img => img.isCharacter);
  const generalImages = filteredImages.filter(img => !img.isCharacter);

  const downloadImage = (image: GeneratedImage) => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = `${image.isCharacter ? 'character' : 'image'}-${image.id}.jpg`;
    link.click();
  };

  const ImageCard = ({ image }: { image: GeneratedImage }) => (
    <div className="relative group rounded-lg overflow-hidden border bg-white shadow-sm hover:shadow-md transition-shadow">
      <img
        src={image.url}
        alt={image.characterName || "Generated image"}
        className="w-full h-32 object-cover"
      />
      
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => downloadImage(image)}
          >
            <Download className="h-3 w-3" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="p-3">
        {image.characterName && (
          <div className="flex items-center gap-2 mb-1">
            <User className="h-3 w-3" />
            <span className="text-xs font-medium">{image.characterName}</span>
          </div>
        )}
        
        <p className="text-xs text-gray-600 line-clamp-2 mb-2">
          {image.prompt}
        </p>
        
        <div className="flex items-center justify-between">
          <Badge variant={image.isCharacter ? "default" : "secondary"} className="text-xs">
            {image.isCharacter ? "Character" : "Image"}
          </Badge>
          <span className="text-xs text-gray-400">
            {image.timestamp.toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          Image Library
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search images..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs value={activeFilter} onValueChange={(value) => setActiveFilter(value as "all" | "character" | "general")}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All ({images.length})</TabsTrigger>
            <TabsTrigger value="character">Characters ({characterImages.length})</TabsTrigger>
            <TabsTrigger value="general">Images ({generalImages.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            {filteredImages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No images yet</p>
                <p className="text-sm">Generate some images to see them here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
                {filteredImages.map((image) => (
                  <ImageCard key={image.id} image={image} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="character" className="mt-4">
            {characterImages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No characters yet</p>
                <p className="text-sm">Create some characters to see them here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
                {characterImages.map((image) => (
                  <ImageCard key={image.id} image={image} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="general" className="mt-4">
            {generalImages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No general images yet</p>
                <p className="text-sm">Generate some images to see them here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
                {generalImages.map((image) => (
                  <ImageCard key={image.id} image={image} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
