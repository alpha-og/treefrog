package billing

import (
	"os"
)

type PlanConfig struct {
	ID            string
	Name          string
	MonthlyBuilds int
	Concurrent    int
	StorageGB     int
}

var Plans = map[string]PlanConfig{
	"free": {
		ID:            os.Getenv("RAZORPAY_PLAN_FREE"),
		Name:          "Free",
		MonthlyBuilds: 50,
		Concurrent:    2,
		StorageGB:     1,
	},
	"pro": {
		ID:            os.Getenv("RAZORPAY_PLAN_PRO"),
		Name:          "Pro",
		MonthlyBuilds: 500,
		Concurrent:    10,
		StorageGB:     10,
	},
	"enterprise": {
		ID:            os.Getenv("RAZORPAY_PLAN_ENTERPRISE"),
		Name:          "Enterprise",
		MonthlyBuilds: -1, // unlimited
		Concurrent:    50,
		StorageGB:     100,
	},
}
