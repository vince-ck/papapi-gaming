"use client"

import type React from "react"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import { Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { addComment } from "@/actions/comments"
import type { Comment } from "@/models/comment"

interface CommentSectionProps {
  requestId: string
  initialComments: Comment[]
}

export function CommentSection({ requestId, initialComments }: CommentSectionProps) {
  const { data: session } = useSession()
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [visibleCount, setVisibleCount] = useState<number>(5)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newComment, setNewComment] = useState<string>("")

  const isAdmin = session?.user?.role === "admin"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newComment.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      // Determine author type based on user role
      const authorName = isAdmin ? "Customer Support" : "Customer"

      const result = await addComment(requestId, newComment, isAdmin, authorName)

      if (result.success && result.comment) {
        // Add the new comment to the list
        setComments([...comments, result.comment])
        setNewComment("")
      } else {
        setError(result.message)
      }
    } catch (error) {
      console.error("Error submitting comment:", error)
      setError("Failed to submit comment")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLoadMore = () => {
    setVisibleCount((prevCount) => prevCount + 5)
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Comments</h3>

      <div className="space-y-4 max-h-[400px] overflow-y-auto p-1">
        {comments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No comments yet</p>
        ) : (
          <>
            {/* Sort comments in reverse chronological order and limit to visibleCount */}
            {[...comments]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, visibleCount)
              .map((comment, index) => {
                // Determine if this comment is unread
                const isUnread =
                  !comment.isRead &&
                  // Comment is from customer and being viewed by admin, or vice versa
                  ((isAdmin && !comment.isAdmin) || (!isAdmin && comment.isAdmin))

                return (
                  <div
                    key={comment._id?.toString() || index}
                    className={`flex gap-3 ${comment.isAdmin ? "justify-start" : "justify-start"}`}
                  >
                    <Avatar className={comment.isAdmin ? "bg-primary/10 text-primary" : "bg-muted"}>
                      <AvatarFallback>{comment.isAdmin ? "CS" : "C"}</AvatarFallback>
                    </Avatar>
                    <div className={`flex-1 space-y-1 ${comment.isAdmin ? "pr-12" : "pl-0 pr-12"}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {comment.authorName || (comment.isAdmin ? "Customer Support" : "Customer")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                        {isUnread && (
                          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
                            New
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-sm whitespace-pre-wrap ${isUnread ? "bg-primary/5 p-3 rounded-md border-l-2 border-primary" : ""}`}
                      >
                        {comment.content}
                      </p>
                    </div>
                  </div>
                )
              })}

            {/* Load More button - only show if there are more comments to load */}
            {comments.length > visibleCount && (
              <div className="flex justify-center pt-2">
                <Button variant="outline" size="sm" onClick={handleLoadMore} className="text-sm">
                  Load More Comments
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="min-h-[100px] resize-none"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || !newComment.trim()}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Comment
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
