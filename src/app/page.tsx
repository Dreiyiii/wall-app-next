'use client'

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";

function App() {
  type Post = {
    id: string;
    body: string;
    image_url: string | null;
    created_at: string;
  };

  const [posts, setPosts] = useState<Post[]>([]);
  const [message, setMessage] = useState<string>("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  const user = {
    name: "James Pascua",
  };

  const staticPosts = [
    { name: "Sheryl", time: "3h ago", message: "Hello James! You're doing well. It is soon to be done." },
    { name: "Carlos", time: "2h ago", message: "Congrats on your progress! Keep pushing." },
    { name: "Mika", time: "1h ago", message: "Just saw your post. Nice work!" },
    { name: "Ryan", time: "30m ago", message: "Can't wait to see the final result!" },
    { name: "Alyssa", time: "15m ago", message: "Wow this looks amazing already 😍" },
    { name: "Ken", time: "10m ago", message: "Let me know if you need help testing it!" },
    { name: "Julia", time: "5m ago", message: "This is shaping up nicely." },
    { name: "Dave", time: "5h ago", message: "Proud of you, James!" },
  ];

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPosts(data);
    } else {
      console.error("Error fetching posts:", error?.message);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const filePath = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("post-images").upload(filePath, file);

    if (error) {
      console.error("Image upload error:", error.message);
      return null;
    }

    const { data: publicData } = supabase.storage.from("post-images").getPublicUrl(filePath);
    return publicData?.publicUrl || null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!message.trim() && !image) return;

    setUploading(true);

    let imageUrl: string | null = null;
    if (image) {
      imageUrl = await uploadImage(image);
    }

    const { error } = await supabase.from("posts").insert({ body: message, image_url: imageUrl });

    if (error) {
      console.error("Error inserting post:", error.message);
    } else {
      setMessage("");
      setImage(null);
      setImagePreview(null);
    }

    setUploading(false);
  };

  useEffect(() => {
    fetchPosts();
    const channel = supabase
      .channel("realtime:posts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload) => {
          setPosts((prev) => [payload.new as Post, ...prev]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="bg-gray-100 main-container w-screen h-screen overflow-x-hidden grid grid-rows-[auto_1fr] p-4">
      <header className="bg-blue-500 text-white p-4 h-10 flex items-center rounded-t-xl">
        <h1 className="font-bold">wall</h1>
      </header>
      <main className="flex gap-4 overflow-x-hidden">
        <aside className="w-[288px] p-6 border-r border-gray-300">
          <nav className="text-black">
            <img src="/my-profile.JPG" alt="My Profile" className="w-[200px] h-[280px] rounded object-cover" />
            <h1 className="text-xl font-semibold mt-2">{user.name}</h1>
            <h3 className="text-sm mt-2">Wall</h3>
            <button className="text-sm shadow-md my-6 p-2 bg-gray-200">Information</button>
            <h4 className="text-sm font-semibold">Networks</h4>
            <h4 className="text-xs font-thin">UCU Alumni</h4>
            <h4 className="text-sm font-semibold mt-2">Current City</h4>
            <h4 className="text-xs font-thin">Tarlac, PH</h4>
          </nav>
        </aside>

        <section className="flex-1 p-6 text-black overflow-y-auto">
          <form onSubmit={handleSubmit} className="mb-8 space-y-3">
            <textarea
              value={message}
              onChange={(e) =>
                e.target.value.length <= 280 && setMessage(e.target.value)
              }
              placeholder="What's on your mind?"
              className="w-full bg-blue-100 text-gray-800 font-semibold text-sm p-4 rounded-sm shadow-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 resize-none h-[100px]"
            />
            <h5 className="text-sm text-gray-500 font-semibold">
              {280 - message.length} characters remaining
            </h5>

            <input type="file" accept="image/*" onChange={handleImageChange} className="text-sm" />
            {imagePreview && <img src={imagePreview} alt="Preview" className="mt-2 max-h-64 rounded border" />}

            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 transition-all duration-200 shadow-md text-sm text-white font-semibold p-2 px-6 rounded"
                disabled={uploading || (!message.trim() && !image)}
              >
                {uploading ? "Posting..." : "Share"}
              </button>
            </div>
          </form>

          {posts.map((post) => (
            <section key={post.id} className="w-full border-b mt-2 border-gray-300 pb-2">
              <div className="flex justify-between mb-1">
                <h2 className="text-lg font-semibold">{user.name}</h2>
                <h5 className="text-sm font-semibold text-gray-800">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </h5>
              </div>
              <h3 className="text-base">{post.body}</h3>
              {post.image_url && <img src={post.image_url} alt="Post" className="w-full max-w-md max-h-72 object-contain" />}
            </section>
          ))}

          {staticPosts.map((post, index) => (
            <section key={`static-${index}`} className="w-full border-b mt-2 border-gray-300 pb-2">
              <div className="flex justify-between mb-1">
                <h2 className="text-lg font-semibold">{post.name}</h2>
                <h5 className="text-sm font-semibold text-gray-800">{post.time}</h5>
              </div>
              <h3 className="text-base">{post.message}</h3>
            </section>
          ))}
        </section>
      </main>
    </div>
  );
}

export default App;
