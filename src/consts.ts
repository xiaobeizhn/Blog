// 站点与仓库配置（前台页面和后台管理都会用到）

// ===== 站点信息 =====
export const SITE_TITLE = '披着被子的博客';
export const SITE_DESCRIPTION = '记录想法、代码与生活';
export const SITE_AUTHOR = '披着被子';

// ===== GitHub 仓库配置（后台管理通过 GitHub API 读写文章）=====
export const REPO = {
	owner: 'xiaobeizhn',
	name: 'Blog',
	branch: 'main',
	// 文章 markdown 文件存放路径（相对于仓库根目录）
	contentPath: 'src/content/blog',
	// 图片上传存放路径（相对于仓库根目录，会输出到 public 下）
	imagesPath: 'public/images',
	// 图片在网站上的 URL 前缀
	imagesUrlPrefix: '/images',
};
