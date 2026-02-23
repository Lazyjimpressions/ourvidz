-- Allow users to insert their own prompt_scores (for QuickRating upsert)
CREATE POLICY "Users can insert own scores" ON prompt_scores
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());