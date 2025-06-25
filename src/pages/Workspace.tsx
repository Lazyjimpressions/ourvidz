
import { useSearchParams } from "react-router-dom";
import { ImageWorkspace } from "./ImageWorkspace";
import { VideoWorkspace } from "./VideoWorkspace";

export const Workspace = () => {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'image';

  if (mode === 'video') {
    return <VideoWorkspace />;
  }

  return <ImageWorkspace />;
};
