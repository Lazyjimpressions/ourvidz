
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Search, Download, Trash2, User, Image, Grid, List, Eye } from "lucide-react";
import { GeneratedImage } from "@/types/image";
import { toast } from "@/hooks/use-toast";

interface ImageLibraryProps {
  images: GeneratedImage[];
  mode: "character" | "general";
}

export const ImageLibrary = ({ images, mode }: ImageLibraryProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "character" | "general">("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);

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
    
    toast({
      title: "Download Started",
      description: "Image download has started.",
    });
  };

  const deleteImage = (image: GeneratedImage) => {
    // In real app, this would remove from the actual collection
    toast({
      title: "Image Deleted",
      description: "Image has been removed from your library.",
      variant: "destructive",
    });
  };

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  const ImageGridCard = ({ image }: { image: GeneratedImage }) => (
    <div className="group relative rounded-lg overflow-hidden border bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105">
      <div className="aspect-square cursor-pointer" onClick={() => setSelectedImage(image)}>
        <img
          src={image.url}
          alt={image.characterName || "Generated image"}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
        />
      </div>
      
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedImage(image);
            }}
            className="transition-all duration-200 hover:scale-110"
          >
            <Eye className="h-3 w-3" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              downloadImage(image);
            }}
            className="transition-all duration-200 hover:scale-110"
          >
            <Download className="h-3 w-3" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => e.stopPropagation()}
                className="transition-all duration-200 hover:scale-110"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Image</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this image? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteImage(image)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="p-3">
        {image.characterName && (
          <div className="flex items-center gap-2 mb-1">
            <User className="h-3 w-3" />
            <span className="text-xs font-medium truncate">{image.characterName}</span>
          </div>
        )}
        
        <p className="text-xs text-gray-600 line-clamp-2 mb-2" title={image.prompt}>
          {truncateText(image.prompt, 60)}
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

  const ImageTableView = ({ images }: { images: GeneratedImage[] }) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Preview</TableHead>
            <TableHead>Name/Prompt</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {images.map((image) => (
            <TableRow key={image.id} className="hover:bg-gray-50 transition-colors">
              <TableCell>
                <div 
                  className="w-12 h-12 rounded-md overflow-hidden cursor-pointer hover:scale-110 transition-transform"
                  onClick={() => setSelectedImage(image)}
                >
                  <img
                    src={image.url}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  {image.characterName && (
                    <div className="font-medium text-sm">{image.characterName}</div>
                  )}
                  <div className="text-sm text-gray-600" title={image.prompt}>
                    {truncateText(image.prompt, 80)}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={image.isCharacter ? "default" : "secondary"}>
                  {image.isCharacter ? "Character" : "Image"}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-gray-500">
                {image.timestamp.toLocaleDateString()}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadImage(image)}
                    className="h-8 w-8 p-0"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Image</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this image? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteImage(image)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <>
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Image Library
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search images..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-1 border rounded-md p-1">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="h-8 w-8 p-0"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="h-8 w-8 p-0"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
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
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {filteredImages.map((image) => (
                    <ImageGridCard key={image.id} image={image} />
                  ))}
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <ImageTableView images={filteredImages} />
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
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {characterImages.map((image) => (
                    <ImageGridCard key={image.id} image={image} />
                  ))}
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <ImageTableView images={characterImages} />
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
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {generalImages.map((image) => (
                    <ImageGridCard key={image.id} image={image} />
                  ))}
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <ImageTableView images={generalImages} />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Image Preview Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="max-w-4xl max-h-[90vh] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-lg overflow-hidden animate-scale-in">
              <div className="aspect-square max-h-[70vh]">
                <img
                  src={selectedImage.url}
                  alt={selectedImage.characterName || "Generated image"}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="p-4 space-y-2">
                {selectedImage.characterName && (
                  <h3 className="font-semibold">{selectedImage.characterName}</h3>
                )}
                <p className="text-sm text-gray-600">{selectedImage.prompt}</p>
                <div className="flex justify-between items-center">
                  <Badge variant={selectedImage.isCharacter ? "default" : "secondary"}>
                    {selectedImage.isCharacter ? "Character" : "Image"}
                  </Badge>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadImage(selectedImage)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedImage(null)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
