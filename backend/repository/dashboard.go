package repository

import (
	"time"
	"xsha-backend/database"

	"gorm.io/gorm"
)

type dashboardRepository struct {
	db *gorm.DB
}

func NewDashboardRepository(db *gorm.DB) DashboardRepository {
	return &dashboardRepository{
		db: db,
	}
}

func (r *dashboardRepository) GetDashboardStats() (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	// Get total projects count
	var projectCount int64
	if err := r.db.Model(&database.Project{}).Count(&projectCount).Error; err != nil {
		return nil, err
	}
	stats["total_projects"] = projectCount

	// Get active environments count
	var envCount int64
	if err := r.db.Model(&database.DevEnvironment{}).Count(&envCount).Error; err != nil {
		return nil, err
	}
	stats["active_environments"] = envCount

	// Get git credentials count
	var credCount int64
	if err := r.db.Model(&database.GitCredential{}).Count(&credCount).Error; err != nil {
		return nil, err
	}
	stats["git_credentials"] = credCount

	// Get tasks count (all tasks)
	var taskCount int64
	if err := r.db.Model(&database.Task{}).Count(&taskCount).Error; err != nil {
		return nil, err
	}
	stats["total_tasks"] = taskCount

	// Get recent tasks count (last 30 days)
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	var recentTaskCount int64
	if err := r.db.Model(&database.Task{}).
		Where("created_at >= ?", thirtyDaysAgo).
		Count(&recentTaskCount).Error; err != nil {
		return nil, err
	}
	stats["recent_tasks"] = recentTaskCount

	// Get tasks by status
	var statusStats []struct {
		Status string
		Count  int64
	}
	if err := r.db.Model(&database.Task{}).
		Select("status, count(*) as count").
		Group("status").
		Scan(&statusStats).Error; err != nil {
		return nil, err
	}

	statusCounts := make(map[string]int64)
	for _, stat := range statusStats {
		statusCounts[stat.Status] = stat.Count
	}
	stats["task_status_counts"] = statusCounts

	return stats, nil
}

func (r *dashboardRepository) GetRecentTasks(limit int) ([]database.Task, error) {
	var tasks []database.Task

	err := r.db.Preload("Project").
		Preload("DevEnvironment").
		Order("created_at DESC").
		Limit(limit).
		Find(&tasks).Error

	return tasks, err
}
