
# worker.py - FIXED VERSION: Corrected file path format for database storage
# FIXES: File path format sent to database (remove bucket prefix)
import os
import json
import time
import requests
import subprocess
import uuid
import shutil
from pathlib import Path
from PIL import Image
import cv2
import torch

# CRITICAL: Disable model offloading by setting distributed environment
os.environ['WORLD_SIZE'] = '2'
os.environ['RANK'] = '0'
os.environ['LOCAL_RANK'] = '0'
os.environ['CUDA_VISIBLE_DEVICES'] = '0'
os.environ['TORCH_USE_CUDA_DSA'] = '1'
os.environ['CUDA_LAUNCH_BLOCKING'] = '0'

class VideoWorker:
    def __init__(self):
        print("🚀 OurVidz Worker initialized (FIXED PATH FORMAT)")
        print("🔧 FIX: Database file paths now exclude bucket prefix")
        
        # Verify CUDA availability
        if not torch.cuda.is_available():
            print("❌ CUDA not available - exiting")
            exit(1)
        
        # Force GPU setup
        torch.cuda.set_device(0)
        torch.cuda.empty_cache()
        
        # Log GPU status
        gpu_name = torch.cuda.get_device_name(0)
        gpu_memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        print(f"🔥 GPU: {gpu_name} ({gpu_memory:.1f}GB)")
        
        # Create temp directories
        self.temp_base = Path("/tmp/ourvidz")
        self.temp_base.mkdir(exist_ok=True)
        self.temp_processing = self.temp_base / "processing"
        self.temp_processing.mkdir(exist_ok=True)
        
        # Paths
        self.model_path = "/workspace/models/wan2.1-t2v-1.3b"
        self.wan_path = "/workspace/Wan2.1"
        
        # FIXED: Job configurations with proper file extensions and storage mapping
        self.job_type_mapping = {
            'image_fast': {
                'content_type': 'image',
                'file_extension': 'png',
                'sample_steps': 4,
                'sample_guide_scale': 3.0,
                'size': '480*832',
                'frame_num': 1,
                'storage_bucket': 'image_fast',
                'expected_time': 4,
                'description': 'Ultra fast image (4s, PNG output)'
            },
            'image_high': {
                'content_type': 'image',
                'file_extension': 'png',
                'sample_steps': 6,
                'sample_guide_scale': 4.0,
                'size': '832*480',
                'frame_num': 1,
                'storage_bucket': 'image_high',
                'expected_time': 6,
                'description': 'High quality image (6s, PNG output)'
            },
            'video_fast': {
                'content_type': 'video',
                'file_extension': 'mp4',
                'sample_steps': 4,  
                'sample_guide_scale': 3.0,
                'size': '480*832',
                'frame_num': 17,
                'storage_bucket': 'video_fast',
                'expected_time': 8,
                'description': 'Fast 1-second video (8s, MP4 output)'
            },
            'video_high': {
                'content_type': 'video',
                'file_extension': 'mp4',
                'sample_steps': 6,
                'sample_guide_scale': 4.0,
                'size': '832*480',
                'frame_num': 17,
                'storage_bucket': 'video_high',
                'expected_time': 12,
                'description': 'High quality 1-second video (12s, MP4 output)'
            }
        }
        
        # Environment variables
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_service_key = os.getenv('SUPABASE_SERVICE_KEY')
        self.redis_url = os.getenv('UPSTASH_REDIS_REST_URL')
        self.redis_token = os.getenv('UPSTASH_REDIS_REST_TOKEN')

        print("🎬 Worker ready - FIXED PATH FORMAT!")

    def generate_with_optimized_settings(self, prompt, job_type):
        """Generate using OPTIMIZED settings with model offloading disabled"""
        config = self.job_type_mapping.get(job_type, self.job_type_mapping['image_fast'])
        
        print(f"⚡ {job_type.upper()} generation")
        print(f"📝 Prompt: {prompt}")
        print(f"🔧 Config: {config['sample_steps']} steps, {config['sample_guide_scale']} guidance")
        
        job_id = str(uuid.uuid4())[:8]
        
        # Always generate as MP4 first (Wan 2.1 only outputs MP4)
        temp_video_filename = f"{job_type}_{job_id}.mp4"
        temp_video_path = self.temp_processing / temp_video_filename
        
        cmd = [
            "python", "generate.py",
            "--task", "t2v-1.3B",
            "--ckpt_dir", self.model_path,
            "--offload_model", "False",
            "--size", config['size'],
            "--sample_steps", str(config['sample_steps']),
            "--sample_guide_scale", str(config['sample_guide_scale']),
            "--frame_num", str(config['frame_num']),
            "--prompt", prompt,
            "--save_file", str(temp_video_path)
        ]
        
        print(f"📁 Generating to: {temp_video_path}")
        
        # Environment with distributed settings to disable offloading
        env = os.environ.copy()
        env.update({
            'WORLD_SIZE': '2',
            'RANK': '0',
            'LOCAL_RANK': '0',
            'CUDA_VISIBLE_DEVICES': '0',
            'TORCH_USE_CUDA_DSA': '1'
        })
        
        original_cwd = os.getcwd()
        os.chdir(self.wan_path)
        
        try:
            start_time = time.time()
            
            result = subprocess.run(
                cmd,
                env=env,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            generation_time = time.time() - start_time
            print(f"⚡ Generation completed in {generation_time:.1f}s")
            
            if result.returncode != 0:
                if (generation_time < 20 and temp_video_path.exists()) or "dist.init_process_group" in str(result.stderr):
                    print("✅ Generation successful (ignoring expected distributed training error)")
                else:
                    print(f"❌ Generation actually failed: {result.stderr[:500]}")
                    return None
                
            # Look for output files
            output_candidates = [
                temp_video_path,
                Path(self.wan_path) / temp_video_filename,
                Path(temp_video_filename),
                Path(f"{job_type}_{job_id}_temp.mp4"),
                Path(f"output.mp4"),
                Path(f"generated.mp4")
            ]
            
            actual_output_path = None
            for candidate in output_candidates:
                if candidate.exists():
                    actual_output_path = candidate
                    print(f"✅ Found output file: {candidate}")
                    break
            
            if not actual_output_path:
                print("❌ Output file not found in any expected location")
                return None
            
            # Move to expected location if needed
            if actual_output_path != temp_video_path:
                shutil.move(str(actual_output_path), str(temp_video_path))
                print(f"📁 Moved output from {actual_output_path} to {temp_video_path}")
            
            # Handle image extraction vs video output
            if config['content_type'] == 'image':
                print(f"🖼️ Extracting image frame from video...")
                return self.extract_frame_from_video(str(temp_video_path), job_id, job_type)
            else:
                print(f"🎥 Returning video file: {temp_video_path}")
                return str(temp_video_path)
            
        except subprocess.TimeoutExpired:
            print("❌ Generation timed out (>30s)")
            return None
        except Exception as e:
            print(f"❌ Error: {e}")
            return None
        finally:
            os.chdir(original_cwd)

    def extract_frame_from_video(self, video_path, job_id, job_type):
        """Extract frame for image jobs and save as PNG"""
        image_path = self.temp_processing / f"{job_type}_{job_id}.png"
        
        try:
            cap = cv2.VideoCapture(video_path)
            ret, frame = cap.read()
            cap.release()
            
            if ret and frame is not None:
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                img = Image.fromarray(frame_rgb)
                img.save(str(image_path), "PNG", optimize=True, quality=95)
                
                file_size = os.path.getsize(image_path) / 1024
                print(f"✅ Frame extracted to PNG: {file_size:.0f}KB")
                
                # Clean up temporary video file
                try:
                    os.remove(video_path)
                    print("🗑️ Temporary video file cleaned up")
                except:
                    pass
                    
                return str(image_path)
            else:
                print("❌ Failed to read frame from video")
                return None
        except Exception as e:
            print(f"❌ Frame extraction error: {e}")
            return None

    def upload_to_supabase(self, file_path, job_type, user_id, job_id):
        """FIXED: Upload to Supabase and return RELATIVE path for database"""
        if not os.path.exists(file_path):
            print(f"❌ File not found for upload: {file_path}")
            return None
            
        config = self.job_type_mapping.get(job_type, self.job_type_mapping['image_fast'])
        storage_bucket = config['storage_bucket']
        content_type = config['content_type']
        file_extension = config['file_extension']
        
        # Create proper file path format
        timestamp = int(time.time())
        filename = f"job_{job_id}_{timestamp}_{job_type}.{file_extension}"
        relative_path = f"{user_id}/{filename}"  # FIXED: This is what goes in database
        full_storage_path = f"{storage_bucket}/{relative_path}"  # Full path for Supabase upload
        
        mime_type = 'image/png' if content_type == 'image' else 'video/mp4'
        
        print(f"📤 FIXED Upload to Supabase:")
        print(f"   Bucket: {storage_bucket}")
        print(f"   Full upload path: {full_storage_path}")
        print(f"   Database path (RELATIVE): {relative_path}")  # FIXED: This is key
        print(f"   MIME: {mime_type}")
        
        try:
            with open(file_path, 'rb') as f:
                file_data = f.read()
                file_size = len(file_data) / 1024
                print(f"📊 File size: {file_size:.0f}KB")
                
                response = requests.post(
                    f"{self.supabase_url}/storage/v1/object/{full_storage_path}",
                    data=file_data,
                    headers={
                        'Authorization': f"Bearer {self.supabase_service_key}",
                        'Content-Type': mime_type,
                        'x-upsert': 'true'
                    },
                    timeout=60
                )
                
                print(f"📡 Upload response: {response.status_code}")
                
                if response.status_code in [200, 201]:
                    print(f"✅ Upload successful to {storage_bucket}")
                    # FIXED: Return ONLY the relative path (not including bucket)
                    print(f"📁 Returning relative path for database: {relative_path}")
                    return relative_path
                else:
                    print(f"❌ Upload failed: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            print(f"❌ Upload error: {e}")
            return None
        finally:
            # Clean up local file
            try:
                if file_path and os.path.exists(file_path):
                    os.remove(file_path)
                    print("🗑️ Local file cleaned up")
            except Exception as e:
                print(f"⚠️ Cleanup warning: {e}")

    def notify_completion(self, job_id, status, file_path=None, error_message=None):
        """Notify completion with file path"""
        data = {
            'jobId': job_id,
            'status': status,
            'filePath': file_path,  # FIXED: Now contains only relative path
            'errorMessage': error_message
        }
        
        print(f"📞 FIXED Calling job-callback for job {job_id}: {status}")
        if file_path:
            print(f"   Relative file path: {file_path}")  # FIXED: No bucket prefix
        
        try:
            response = requests.post(
                f"{self.supabase_url}/functions/v1/job-callback",
                json=data,
                headers={
                    'Authorization': f"Bearer {self.supabase_service_key}",
                    'Content-Type': 'application/json'
                },
                timeout=15
            )
            
            print(f"📡 Callback response: {response.status_code}")
            if response.status_code != 200:
                print(f"❌ Callback error details: {response.text}")
            
            if response.status_code == 200:
                print("✅ Callback sent successfully")
            else:
                print(f"❌ Callback failed: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Callback error: {e}")

    def process_job(self, job_data):
        """Process job with FIXED path format"""
        job_id = job_data.get('jobId')
        job_type = job_data.get('jobType')
        prompt = job_data.get('prompt')
        user_id = job_data.get('userId')
        
        if not all([job_id, job_type, user_id, prompt]):
            error_msg = "Missing required fields"
            print(f"❌ {error_msg}")
            self.notify_completion(job_id or 'unknown', 'failed', error_message=error_msg)
            return

        print(f"📥 FIXED Processing job: {job_id} ({job_type})")
        print(f"👤 User: {user_id}")
        print(f"📝 Prompt: {prompt[:50]}...")
        start_time = time.time()
        
        try:
            torch.cuda.empty_cache()
            
            # Generate content
            output_path = self.generate_with_optimized_settings(prompt, job_type)
            if output_path:
                print(f"✅ Generation successful: {Path(output_path).name}")
                
                # FIXED: Upload returns relative path only
                relative_path = self.upload_to_supabase(output_path, job_type, user_id, job_id)
                if relative_path:
                    duration = time.time() - start_time
                    expected = self.job_type_mapping[job_type]['expected_time']
                    
                    print(f"🎉 FIXED Job completed in {duration:.1f}s")
                    print(f"📁 File: {relative_path}")  # FIXED: No bucket prefix
                    self.notify_completion(job_id, 'completed', relative_path)
                    return
                else:
                    print("❌ Upload to Supabase failed")
            else:
                print("❌ Generation failed")
                    
            self.notify_completion(job_id, 'failed', error_message="Generation or upload failed")
            
        except Exception as e:
            print(f"❌ Job processing error: {e}")
            self.notify_completion(job_id, 'failed', error_message=str(e))

    def poll_queue(self):
        """Poll Redis queue"""
        try:
            response = requests.get(
                f"{self.redis_url}/rpop/job_queue",
                headers={'Authorization': f"Bearer {self.redis_token}"},
                timeout=5
            )
            if response.status_code == 200 and response.json().get('result'):
                return json.loads(response.json()['result'])
        except Exception as e:
            print(f"❌ Poll error: {e}")
        return None

    def run(self):
        """Main loop with FIXED path handling"""
        print("⏳ Waiting for jobs...")
        print("🚀 FIXED PATH FORMAT Worker:")
        print("🔧 KEY FIX: Database now stores relative paths without bucket prefix")
        print("   Example: user_id/job_123_timestamp.png (NOT bucket/user_id/job_123_timestamp.png)")
        print("   This fixes 'Object not found' errors in signed URL generation")
        
        job_count = 0
        
        while True:
            job = self.poll_queue()
            if job:
                job_count += 1
                print(f"\n🎯 Processing job #{job_count}")
                self.process_job(job)
                torch.cuda.empty_cache()
                print("=" * 60)
            else:
                time.sleep(5)

if __name__ == "__main__":
    print("🚀 Starting OurVidz FIXED PATH FORMAT Worker")
    print("🔧 KEY FIX: Removes bucket prefix from database file paths")
    
    # Verify environment
    required_vars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']
    missing = [var for var in required_vars if not os.getenv(var)]
    if missing:
        print(f"❌ Missing environment variables: {missing}")
        exit(1)
    
    try:
        worker = VideoWorker()
        worker.run()
    except Exception as e:
        print(f"❌ Worker failed: {e}")
        exit(1)
