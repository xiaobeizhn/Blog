import { useState } from 'react';
import { GitHubClient } from './github';
import type { GitHubUser } from './types';

const STORAGE_KEY = 'blog_admin_token';

interface Props {
	onAuth: (client: GitHubClient, user: GitHubUser) => void;
}

export default function AuthGate({ onAuth }: Props) {
	const [token, setToken] = useState('');
	const [error, setError] = useState('');
	const [verifying, setVerifying] = useState(false);

	async function handleVerify(tryToken: string) {
		setError('');
		setVerifying(true);
		try {
			const client = new GitHubClient(tryToken);
			const user = await client.verifyToken();
			localStorage.setItem(STORAGE_KEY, tryToken);
			onAuth(client, user);
		} catch (e) {
			setError(e instanceof Error ? e.message : '验证失败');
		} finally {
			setVerifying(false);
		}
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!token.trim()) return;
		handleVerify(token.trim());
	}

	return (
		<div className="auth-gate">
			<div className="auth-card">
				<h1>博客管理后台</h1>
				<p className="auth-sub">请输入 GitHub Personal Access Token 登录</p>
				<form onSubmit={handleSubmit}>
					<input
						type="password"
						value={token}
						onChange={(e) => setToken(e.target.value)}
						placeholder="ghp_... 或 github_pat_..."
						autoComplete="off"
						autoFocus
					/>
					{error && <p className="auth-error">{error}</p>}
					<button type="submit" disabled={verifying || !token.trim()}>
						{verifying ? '验证中…' : '登录'}
					</button>
				</form>
				<div className="auth-help">
					<p>
						<strong>如何获取 Token：</strong>
					</p>
					<ol>
						<li>
							打开{' '}
							<a href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noreferrer">
								GitHub Token 设置页
							</a>
						</li>
						<li>生成一个 <strong>Fine-grained</strong> Token</li>
						<li>仅授权 <code>Blog</code> 仓库，权限选择 <code>Contents: Read and write</code></li>
						<li>复制生成的 Token 粘贴到上方</li>
					</ol>
					<p className="auth-note">
						Token 仅保存在你的浏览器本地（localStorage），不会上传到服务器。
					</p>
				</div>
			</div>
		</div>
	);
}

/** 启动时尝试自动登录 */
export function tryAutoLogin(): string | null {
	return localStorage.getItem(STORAGE_KEY);
}

export function clearStoredToken() {
	localStorage.removeItem(STORAGE_KEY);
}
