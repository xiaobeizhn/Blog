import { useState } from 'react';
import type { ArticleListItem, ArticleEditState } from './types';

interface Props {
	articles: ArticleListItem[];
	loading: boolean;
	onEdit: (filename: string) => void;
	onNew: () => void;
	onDelete: (filename: string, sha: string) => void;
	onRefresh: () => void;
}

export default function ArticleList({ articles, loading, onEdit, onNew, onDelete, onRefresh }: Props) {
	const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

	function handleDelete(filename: string, sha: string) {
		if (confirmDelete === filename) {
			onDelete(filename, sha);
			setConfirmDelete(null);
		} else {
			setConfirmDelete(filename);
			// 3 秒后自动取消确认
			setTimeout(() => setConfirmDelete(null), 3000);
		}
	}

	if (loading) {
		return <div className="admin-loading">加载中…</div>;
	}

	return (
		<div className="article-list">
			<div className="list-header">
				<h2>文章管理</h2>
				<div className="list-actions">
					<button className="btn-secondary" onClick={onRefresh}>刷新</button>
					<button className="btn-primary" onClick={onNew}>+ 新建文章</button>
				</div>
			</div>

			{articles.length === 0 ? (
				<div className="empty-state">
					<p>还没有文章</p>
					<button className="btn-primary" onClick={onNew}>写第一篇</button>
				</div>
			) : (
				<table className="article-table">
					<thead>
						<tr>
							<th>标题</th>
							<th>日期</th>
							<th>标签</th>
							<th>状态</th>
							<th>操作</th>
						</tr>
					</thead>
					<tbody>
						{articles.map((a) => (
							<tr key={a.filename}>
								<td className="td-title">{a.title}</td>
								<td className="td-date">{a.pubDate || '—'}</td>
								<td className="td-tags">
									{a.tags.length > 0 ? a.tags.map((t) => (
										<span key={t} className="tag">#{t}</span>
									)) : '—'}
								</td>
								<td>
									{a.draft ? (
										<span className="badge badge-draft">草稿</span>
									) : (
										<span className="badge badge-published">已发布</span>
									)}
								</td>
								<td className="td-actions">
									<button className="btn-small" onClick={() => onEdit(a.filename)}>编辑</button>
									<button
										className={`btn-small btn-danger ${confirmDelete === a.filename ? 'confirming' : ''}`}
										onClick={() => handleDelete(a.filename, a.sha)}
									>
										{confirmDelete === a.filename ? '确认删除？' : '删除'}
									</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
}
