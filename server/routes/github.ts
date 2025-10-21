import { Router, Request, Response } from "express";
import { Octokit } from "@octokit/rest";

const router = Router();

// Initialize Octokit with GitHub token
function getOctokit() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN not configured");
  }
  return new Octokit({ auth: token });
}

// Get authenticated user info
router.get("/user", async (req: Request, res: Response) => {
  try {
    const octokit = getOctokit();
    const { data } = await octokit.rest.users.getAuthenticated();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ 
      error: "Failed to fetch user info",
      message: error.message 
    });
  }
});

// List user repositories
router.get("/repos", async (req: Request, res: Response) => {
  try {
    const octokit = getOctokit();
    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      sort: "updated",
      per_page: 100
    });
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ 
      error: "Failed to fetch repositories",
      message: error.message 
    });
  }
});

// Get specific repository
router.get("/repos/:owner/:repo", async (req: Request, res: Response) => {
  try {
    const { owner, repo } = req.params;
    const octokit = getOctokit();
    const { data } = await octokit.rest.repos.get({ owner, repo });
    res.json(data);
  } catch (error: any) {
    res.status(404).json({ 
      error: "Repository not found",
      message: error.message 
    });
  }
});

// Create a new repository
router.post("/repos", async (req: Request, res: Response) => {
  try {
    const { name, description, private: isPrivate = false, auto_init = true } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "Repository name is required" });
    }

    const octokit = getOctokit();
    const { data } = await octokit.rest.repos.createForAuthenticatedUser({
      name,
      description,
      private: isPrivate,
      auto_init
    });
    
    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ 
      error: "Failed to create repository",
      message: error.message 
    });
  }
});

// List repository branches
router.get("/repos/:owner/:repo/branches", async (req: Request, res: Response) => {
  try {
    const { owner, repo } = req.params;
    const octokit = getOctokit();
    const { data } = await octokit.rest.repos.listBranches({ owner, repo });
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ 
      error: "Failed to fetch branches",
      message: error.message 
    });
  }
});

// Get repository contents
router.get("/repos/:owner/:repo/contents/*", async (req: Request, res: Response) => {
  try {
    const { owner, repo } = req.params;
    const path = req.params[0] || "";
    const octokit = getOctokit();
    const { data } = await octokit.rest.repos.getContent({ 
      owner, 
      repo, 
      path 
    });
    res.json(data);
  } catch (error: any) {
    res.status(404).json({ 
      error: "Content not found",
      message: error.message 
    });
  }
});

// Create or update file in repository
router.put("/repos/:owner/:repo/contents/*", async (req: Request, res: Response) => {
  try {
    const { owner, repo } = req.params;
    const path = req.params[0];
    const { message, content, branch = "main", sha } = req.body;

    if (!message || !content) {
      return res.status(400).json({ 
        error: "Commit message and content are required" 
      });
    }

    const octokit = getOctokit();
    
    // Content must be base64 encoded
    const encodedContent = Buffer.from(content).toString("base64");
    
    const params: any = {
      owner,
      repo,
      path,
      message,
      content: encodedContent,
      branch
    };

    // If sha is provided, this is an update
    if (sha) {
      params.sha = sha;
    }

    const { data } = await octokit.rest.repos.createOrUpdateFileContents(params);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ 
      error: "Failed to create/update file",
      message: error.message 
    });
  }
});

// List repository commits
router.get("/repos/:owner/:repo/commits", async (req: Request, res: Response) => {
  try {
    const { owner, repo } = req.params;
    const octokit = getOctokit();
    const { data } = await octokit.rest.repos.listCommits({ 
      owner, 
      repo,
      per_page: 50 
    });
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ 
      error: "Failed to fetch commits",
      message: error.message 
    });
  }
});

// Create an issue
router.post("/repos/:owner/:repo/issues", async (req: Request, res: Response) => {
  try {
    const { owner, repo } = req.params;
    const { title, body, labels, assignees } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Issue title is required" });
    }

    const octokit = getOctokit();
    const { data } = await octokit.rest.issues.create({
      owner,
      repo,
      title,
      body,
      labels,
      assignees
    });
    
    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ 
      error: "Failed to create issue",
      message: error.message 
    });
  }
});

// List repository issues
router.get("/repos/:owner/:repo/issues", async (req: Request, res: Response) => {
  try {
    const { owner, repo } = req.params;
    const octokit = getOctokit();
    const { data } = await octokit.rest.issues.listForRepo({ 
      owner, 
      repo,
      state: "all",
      per_page: 50 
    });
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ 
      error: "Failed to fetch issues",
      message: error.message 
    });
  }
});

export default router;
